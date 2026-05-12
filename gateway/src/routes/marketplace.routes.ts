import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { forwardToMonolith } from '../lib/proxy';

const router = Router();

router.get('/loads', authenticate, requirePermission('marketplace:read'), forwardToMonolith);
router.get('/trucks', authenticate, requirePermission('marketplace:read'), forwardToMonolith);
router.post(
  '/saved-searches',
  authenticate,
  requirePermission('marketplace:write'),
  forwardToMonolith,
);
router.get(
  '/saved-searches',
  authenticate,
  requirePermission('marketplace:read'),
  forwardToMonolith,
);
router.delete(
  '/saved-searches/:id',
  authenticate,
  requirePermission('marketplace:write'),
  forwardToMonolith,
);
router.post('/lanes', authenticate, requirePermission('marketplace:write'), forwardToMonolith);
router.get('/lanes', authenticate, requirePermission('marketplace:read'), forwardToMonolith);
router.delete(
  '/lanes/:id',
  authenticate,
  requirePermission('marketplace:write'),
  forwardToMonolith,
);

export { router as marketplaceRoutes };
