import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { forwardToMonolith } from '../lib/proxy';

const router = Router();

router.get('/', authenticate, requirePermission('team:read'), forwardToMonolith);
router.get('/members', authenticate, requirePermission('team:read'), forwardToMonolith);
router.post('/members', authenticate, requirePermission('team:invite'), forwardToMonolith);
router.post('/invite', authenticate, requirePermission('team:invite'), forwardToMonolith);
router.post('/accept-invite', forwardToMonolith);
router.patch(
  '/members/:memberId',
  authenticate,
  requirePermission('team:manage'),
  forwardToMonolith,
);
router.delete(
  '/members/:memberId',
  authenticate,
  requirePermission('team:manage'),
  forwardToMonolith,
);
router.get('/roles', authenticate, requirePermission('team:read'), forwardToMonolith);
router.post('/roles', authenticate, requirePermission('team:roles:manage'), forwardToMonolith);
router.put(
  '/roles/:roleId',
  authenticate,
  requirePermission('team:roles:manage'),
  forwardToMonolith,
);
router.delete(
  '/roles/:roleId',
  authenticate,
  requirePermission('team:roles:manage'),
  forwardToMonolith,
);

export { router as teamRoutes };
