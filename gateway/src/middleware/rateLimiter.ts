import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { JwtClaims } from '@flow/shared';

const CLIENT_KEY = (req: Request): string => {
  const user = req.user as JwtClaims | undefined;
  return user?.userId || req.ip || 'anonymous';
};

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: CLIENT_KEY,
});

export const strictAuthLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: CLIENT_KEY,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' },
  },
});

export const otpLimiter = rateLimit({
  windowMs: 60_000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: CLIENT_KEY,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many OTP requests. Please wait before trying again.',
    },
  },
});

export const introspectLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: CLIENT_KEY,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many token validation requests.' },
  },
});
