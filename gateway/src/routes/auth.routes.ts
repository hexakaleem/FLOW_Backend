import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { strictAuthLimiter, otpLimiter, introspectLimiter } from '../middleware/rateLimiter';
import { forwardToMonolith } from '../lib/proxy';

const router = Router();

router.post('/register', forwardToMonolith);
router.post('/login', strictAuthLimiter, forwardToMonolith);
router.post('/refresh', forwardToMonolith);
router.post('/forgot-password', otpLimiter, forwardToMonolith);
router.post('/reset-password', otpLimiter, forwardToMonolith);
router.post('/send-verification-otp', otpLimiter, forwardToMonolith);
router.post('/verify-otp', forwardToMonolith);
router.post('/change-password', authenticate, forwardToMonolith);
router.post('/verify-email', forwardToMonolith);
router.post('/logout', authenticate, forwardToMonolith);
router.post('/verify-identity', authenticate, forwardToMonolith);
router.get('/me', authenticate, forwardToMonolith);
router.post('/introspect', introspectLimiter, forwardToMonolith);
router.post('/promote-by-secret', forwardToMonolith);
router.patch('/onboarding/profile', authenticate, forwardToMonolith);
router.patch('/onboarding/business', authenticate, forwardToMonolith);
router.patch('/onboarding/stripe', authenticate, forwardToMonolith);
router.patch('/onboarding/prefs', authenticate, forwardToMonolith);

export { router as authRoutes };
