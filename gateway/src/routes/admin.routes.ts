import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { forwardToMonolith } from '../lib/proxy';

const router = Router();

// --- Verifications ---
router.get('/verifications', authenticate, requireRole('admin'), forwardToMonolith);
router.get('/verifications/:userId/documents', authenticate, requireRole('admin'), forwardToMonolith);
router.post('/verifications/:userId/approve', authenticate, requireRole('admin'), forwardToMonolith);
router.post('/verifications/:userId/reject', authenticate, requireRole('admin'), forwardToMonolith);

// --- User Management ---
router.get('/users', authenticate, requireRole('admin'), forwardToMonolith);
router.post('/users/:userId/suspend', authenticate, requireRole('admin'), forwardToMonolith);
router.post('/users/:userId/reactivate', authenticate, requireRole('admin'), forwardToMonolith);

export { router as adminRoutes };
