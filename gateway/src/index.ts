import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import { apiLimiter } from './middleware/rateLimiter';
import { mountRoutes } from './routes';

const app = express();

app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json());
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Request-Id', uuidv4());
  next();
});
app.use(apiLimiter);

app.get("/health",(_r,rs)=>rs.json({status:"ok"})); mountRoutes(app);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = (err as unknown as { statusCode?: number }).statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'development' ? err.message : 'Internal server error',
    },
  });
});

app.listen(config.port, () => {
  console.log(`Gateway listening on port ${config.port} [${config.nodeEnv}]`);
});

export default app;
