import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { forwardToMonolith } from '../lib/proxy';

const router = Router();

// --- Trucks ---
router.post('/trucks', authenticate, requirePermission('fleet:write'), forwardToMonolith);
router.get('/trucks/available', authenticate, requirePermission('fleet:read'), forwardToMonolith);
router.get('/trucks', authenticate, requirePermission('fleet:read'), forwardToMonolith);
router.get('/trucks/:id', authenticate, requirePermission('fleet:read'), forwardToMonolith);
router.patch('/trucks/:id', authenticate, requirePermission('fleet:write'), forwardToMonolith);
router.delete('/trucks/:id', authenticate, requirePermission('fleet:delete'), forwardToMonolith);

// VIN decode
router.post(
  '/trucks/:id/vin-decode',
  authenticate,
  requirePermission('fleet:write'),
  forwardToMonolith,
);

// Driver and GPS assignment
router.patch(
  '/trucks/:id/assign-driver',
  authenticate,
  requirePermission('fleet:write'),
  forwardToMonolith,
);
router.patch(
  '/trucks/:id/assign-gps',
  authenticate,
  requirePermission('fleet:write'),
  forwardToMonolith,
);

// --- Trailers ---
router.post('/trailers', authenticate, requirePermission('fleet:write'), forwardToMonolith);
router.get('/trailers', authenticate, requirePermission('fleet:read'), forwardToMonolith);
router.patch(
  '/trailers/:id/assign-truck',
  authenticate,
  requirePermission('fleet:write'),
  forwardToMonolith,
);

// --- Compliance ---
router.get('/compliance', authenticate, requirePermission('fleet:read'), forwardToMonolith);
router.patch(
  '/compliance/:driverId',
  authenticate,
  requirePermission('fleet:write'),
  forwardToMonolith,
);

export { router as fleetRoutes };
