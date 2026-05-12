import { Router, Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { AuthController } from './auth.controller';
import { verifyJWT } from '../../middleware/rbac';

const identityVerificationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are allowed'));
    }
  },
});

export const authRoutes = Router();

// ── Public routes (no JWT required) ──────────────────────────────────────
authRoutes.post('/register', AuthController.register);
authRoutes.post('/login', AuthController.login);
authRoutes.post('/refresh', AuthController.refresh);
authRoutes.post('/forgot-password', AuthController.forgotPassword);
authRoutes.post('/reset-password', AuthController.resetPassword);
authRoutes.post('/send-verification-otp', AuthController.sendVerificationOTP);
authRoutes.post('/verify-otp', AuthController.verifyOTP);
authRoutes.post('/verify-email', AuthController.verifyEmail);
authRoutes.post('/introspect', AuthController.introspect);

// ── Authenticated routes (JWT required) ───────────────────────────────────
authRoutes.post('/logout', verifyJWT, AuthController.logout);
authRoutes.post('/change-password', verifyJWT, AuthController.changePassword);
authRoutes.get('/me', verifyJWT, AuthController.getMe);
authRoutes.post(
  '/verify-identity',
  verifyJWT,
  identityVerificationUpload.array('documents', 5),
  AuthController.verifyIdentity,
);
authRoutes.patch('/onboarding/profile', verifyJWT, AuthController.completeProfileOnboarding);
authRoutes.patch('/onboarding/business', verifyJWT, AuthController.completeBusinessOnboarding);
authRoutes.patch('/onboarding/stripe', verifyJWT, AuthController.completeStripeOnboarding);
authRoutes.patch('/onboarding/prefs', verifyJWT, AuthController.completePreferenceOnboarding);
