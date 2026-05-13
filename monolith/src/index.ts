import express from 'express';
import cors from 'cors';
import path from 'path';
import { v4 as uuidV4 } from 'uuid';
import { config } from './config';
import { connectDatabases } from './lib/mongo';
import { verifyJWT } from './middleware/rbac';
import { globalErrorHandler } from './lib/errors';

import { authRoutes } from './modules/auth';
import { userRoutes, teamRoutes } from './modules/users';
import { UsersController } from './modules/users/users.controller';
import { fleetRoutes } from './modules/fleet';
import { loadRoutes, marketplaceRoutes } from './modules/loads';
import { analyticsRoutes } from './modules/analytics';
import { adminRoutes } from './modules/admin';
import { documentRoutes } from './modules/documents';
import { deviceRoutes } from './modules/users/devices.routes';
import { messageRoutes } from './modules/messaging';
import { reviewRoutes } from './modules/reviews';
import { notificationRoutes } from './modules/notifications';
import { ticketRoutes } from './modules/support';
import './queues/matching.queue';
import './queues/notification.queue';
import { startEventSubscriber } from './events/event.subscriber';
import { redis } from './lib/redis';

async function bootstrap(): Promise<void> {
  await connectDatabases();
  await redis.ping(); // ensure Redis is reachable
  startEventSubscriber(); // bridge domain events to BullMQ workers

  const app = express();

  app.use(
    cors({
      origin: config.corsOrigins === '*' ? true : config.corsOrigins.split(',').map(s => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Serve locally-uploaded files (dev/demo fallback when Cloudinary is not configured)
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

  app.use((req, _res, next) => {
    (req as unknown as Record<string, unknown>).requestId = uuidV4();
    next();
  });

  // Auth routes - NO JWT check (public)
  app.use('/api/auth', authRoutes);

  // Public accept-invite route (new users need to accept without being logged in)
  // Mounted BEFORE verifyJWT so unauthenticated users can accept invites
  app.post('/api/teams/accept-invite', (req, res, next) =>
    UsersController.acceptInvite(req, res, next),
  );

  // All other API routes - REQUIRE JWT
  app.use('/api/users', verifyJWT, userRoutes);
  app.use('/api/teams', verifyJWT, teamRoutes);
  app.use('/api/fleet', verifyJWT, fleetRoutes);
  app.use('/api/loads', verifyJWT, loadRoutes);
  app.use('/api/marketplace', verifyJWT, marketplaceRoutes);
  app.use('/api/analytics', verifyJWT, analyticsRoutes);
  app.use('/api/devices', verifyJWT, deviceRoutes);
  app.use('/api/messages', verifyJWT, messageRoutes);
  app.use('/api/reviews', verifyJWT, reviewRoutes);
  app.use('/api/notifications', verifyJWT, notificationRoutes);
  app.use('/api/tickets', verifyJWT, ticketRoutes);
  app.use('/api/admin', verifyJWT, adminRoutes);
  app.use('/api/documents', verifyJWT, documentRoutes);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(globalErrorHandler);

  app.listen(config.port, () => {
    console.log(`[MONOLITH] Running on port ${config.port} (${config.nodeEnv})`);
  });
}

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`[MONOLITH] ${signal} — closing workers and connections`);
  const { notificationWorker } = await import('./queues/notification.queue');
  const { nearbyMatcherWorker } = await import('./queues/matching.queue');
  await notificationWorker.close();
  await nearbyMatcherWorker.close();
  await redis.quit();
  console.log('[MONOLITH] graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

bootstrap().catch((error) => {
  console.error('[MONOLITH] Failed to start:', error);
  process.exit(1);
});
