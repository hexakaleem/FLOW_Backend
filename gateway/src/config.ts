import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  monolithUrl: process.env.MONOLITH_URL || 'http://localhost:4000/api',
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key',
  jwtPublicKey: process.env.JWT_PUBLIC_KEY || 'dev-public-key-change-in-production',
  corsOrigins: (process.env.CORS_ORIGINS || '*')
    .split(',')
    .map((s) => s.trim()),

  authServiceUrl: process.env.AUTH_SERVICE_URL,
  userServiceUrl: process.env.USER_SERVICE_URL,
  fleetServiceUrl: process.env.FLEET_SERVICE_URL,
  loadServiceUrl: process.env.LOAD_SERVICE_URL,
};
