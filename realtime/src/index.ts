import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { verifySocketToken } from './lib/auth';
import { subscribeToDeliveryEvents } from './handlers/event.router';

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'realtime' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigins,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Auth middleware: verify JWT on connection
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) {
    return next(new Error('Authentication error: token required'));
  }

  const user = await verifySocketToken(token);
  if (!user) {
    return next(new Error('Authentication error: invalid token'));
  }

  socket.data.user = user;
  next();
});

io.on('connection', (socket) => {
  const user = socket.data.user as { userId: string; orgId: string | null; role: string };
  console.log(`[REALTIME] user connected: ${user.userId} (${user.role})`);

  // Join personal room
  socket.join(`user:${user.userId}`);

  // Join org room if applicable
  if (user.orgId) {
    socket.join(`org:${user.orgId}`);
  }

  // Join driver room for nearby load alerts
  if (user.role === 'company_driver' || user.role === 'independent_driver') {
    socket.join(`driver:${user.userId}`);
  }

  // Allow client to subscribe to specific load updates (e.g., live tracking)
  socket.on('subscribe:load', (loadId: string) => {
    socket.join(`load:${loadId}`);
    console.log(`[REALTIME] ${user.userId} subscribed to load:${loadId}`);
  });

  socket.on('unsubscribe:load', (loadId: string) => {
    socket.leave(`load:${loadId}`);
    console.log(`[REALTIME] ${user.userId} unsubscribed from load:${loadId}`);
  });

  // Driver location update (optional: can also be done via REST)
  socket.on('driver:location', async (data: { lat: number; lng: number }) => {
    if (user.role !== 'company_driver' && user.role !== 'independent_driver') {
      return;
    }
    // Forward to Redis GEO for nearby matching
    const { redis } = await import('./lib/redis');
    await redis.geoadd('drivers:locations', data.lng, data.lat, user.userId);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[REALTIME] user disconnected: ${user.userId} (${reason})`);
  });
});

// Subscribe to Redis delivery events from Monolith/BullMQ
subscribeToDeliveryEvents(io);

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`[REALTIME] ${signal} received — closing connections`);
  io.close(() => {
    console.log('[REALTIME] Socket.io server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.log('[REALTIME] Forced exit after timeout');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

httpServer.listen(config.port, () => {
  console.log(`[REALTIME] Server running on port ${config.port}`);
});
