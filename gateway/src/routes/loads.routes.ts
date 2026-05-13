import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { forwardToMonolith } from '../lib/proxy';

const router = Router();

router.post('/', authenticate, requirePermission('load:create'), forwardToMonolith);
router.get('/', authenticate, requirePermission('load:read'), forwardToMonolith);
router.get('/summary', authenticate, requirePermission('load:read'), forwardToMonolith);
router.get('/:id', authenticate, requirePermission('load:read'), forwardToMonolith);
router.patch('/:id', authenticate, requirePermission('load:update'), forwardToMonolith);

// Status transition
router.patch('/:id/status', authenticate, requirePermission('load:update'), forwardToMonolith);

// Assign truck
router.post('/:id/assign-truck', authenticate, requirePermission('load:update'), forwardToMonolith);

// Booking requests
router.get(
  '/:id/booking-requests',
  authenticate,
  requirePermission('load:read'),
  forwardToMonolith,
);
router.post(
  '/:id/booking-request',
  authenticate,
  requirePermission('load:book'),
  forwardToMonolith,
);
router.post(
  '/:id/booking-confirm',
  authenticate,
  requirePermission('load:update'),
  forwardToMonolith,
);
router.post('/:id/booking-deny', authenticate, requirePermission('load:update'), forwardToMonolith);

// Counteroffers
router.post('/:id/counteroffer', authenticate, requirePermission('load:update'), forwardToMonolith);
router.post(
  '/:id/counteroffer/:offerId/accept',
  authenticate,
  requirePermission('load:update'),
  forwardToMonolith,
);

// Truck requests
router.post(
  '/:id/truck-request',
  authenticate,
  requirePermission('load:update'),
  forwardToMonolith,
);
router.post(
  '/:id/truck-request/:reqId/confirm',
  authenticate,
  requirePermission('load:update'),
  forwardToMonolith,
);
router.post(
  '/:id/truck-request/:reqId/deny',
  authenticate,
  requirePermission('load:update'),
  forwardToMonolith,
);

// Load templates
router.get('/templates', authenticate, requirePermission('load:read'), forwardToMonolith);
router.post('/:id/templates', authenticate, requirePermission('load:update'), forwardToMonolith);

// Lifecycle actions
router.post('/:id/post', authenticate, requirePermission('load:update'), forwardToMonolith);
router.post('/:id/cancel', authenticate, requirePermission('load:update'), forwardToMonolith);

// Booking cancellation
router.put(
  '/:id/bookings/:bookingId/cancel',
  authenticate,
  requirePermission('load:cancel'),
  forwardToMonolith,
);

// Matching
router.get('/:id/matching-trucks', authenticate, requirePermission('load:read'), forwardToMonolith);

export { router as loadRoutes };
