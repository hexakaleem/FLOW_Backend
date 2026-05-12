import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017',
    options: { maxPoolSize: 10, minPoolSize: 2 },
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-key-change-in-production',
    privateKey: process.env.JWT_SECRET || 'dev-jwt-secret-key-change-in-production',
    accessTokenTTL: 24 * 60 * 60,
    refreshTokenTTL: 7 * 24 * 60 * 60,
  },

  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key',

  external: {
    fmcsaApiKey: process.env.FMCSA_API_KEY,
    nominatimUrl: process.env.NOMINATIM_API_URL || 'https://nominatim.openstreetmap.org',
    nhtsaVinUrl: process.env.NHTSA_VIN_API_URL || 'https://vpic.nhtsa.dot.gov/api',
  },

  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  corsOrigins: process.env.CORS_ORIGINS || '*',

  cloudinary: {
    url: process.env.CLOUDINARY_URL || '',
  },

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  },
};
