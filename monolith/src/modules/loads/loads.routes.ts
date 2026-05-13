import { Router } from 'express';
import { LoadsController } from './loads.controller';
import { verifyJWT, checkRole, checkPermission } from '../../middleware/rbac';

export const loadRoutes = Router();

// All routes require authentication
loadRoutes.use(verifyJWT);

// Broker only: create loads
loadRoutes.post('/', checkRole(['broker']), LoadsController.createLoad);

// Broker + Carrier + Independent Driver: list own loads
loadRoutes.get(
  '/',
  checkRole(['broker', 'carrier', 'independent_driver']),
  checkPermission('loads.view'),
  LoadsController.listLoads,
);

// Broker + Carrier + Independent Driver: summary
loadRoutes.get(
  '/summary',
  checkRole(['broker', 'carrier', 'independent_driver']),
  checkPermission('loads.view'),
  LoadsController.getSummary,
);

// Load templates (broker only)
loadRoutes.get('/templates', checkRole(['broker']), LoadsController.listTemplates);

// Broker + Carrier + Independent Driver: get individual load
loadRoutes.get('/:id', checkRole(['broker', 'carrier', 'independent_driver']), LoadsController.getLoad);

// Broker only: edit load
loadRoutes.patch('/:id', checkRole(['broker']), LoadsController.updateLoad);

// Broker only: transition status
loadRoutes.patch('/:id/status', checkRole(['broker']), LoadsController.transitionStatus);

// Broker only: post load (draft → posted)
loadRoutes.post('/:id/post', checkRole(['broker']), LoadsController.postLoad);

// Broker only: cancel load
loadRoutes.post('/:id/cancel', checkRole(['broker']), LoadsController.cancelLoad);

// Broker only: delete draft load
loadRoutes.delete('/:id', checkRole(['broker']), LoadsController.deleteDraft);

// Broker only: save as template
loadRoutes.post('/:id/templates', checkRole(['broker']), LoadsController.saveAsTemplate);

// Broker only: assign truck
loadRoutes.post('/:id/assign-truck', checkRole(['broker']), LoadsController.assignTruck);

// Carrier + Independent Driver (with loads.book): booking request
loadRoutes.post(
  '/:id/booking-request',
  checkRole(['carrier', 'independent_driver']),
  checkPermission('loads.book'),
  LoadsController.requestBooking,
);

// Broker only: confirm booking
loadRoutes.post('/:id/booking-confirm', checkRole(['broker']), LoadsController.confirmBooking);

// Broker only: deny booking
loadRoutes.post('/:id/booking-deny', checkRole(['broker']), LoadsController.denyBooking);

// Broker only: list booking requests
loadRoutes.get('/:id/booking-requests', checkRole(['broker']), LoadsController.listBookingRequests);

// Carrier + Independent Driver (with loads.book): cancel own booking
loadRoutes.put(
  '/:id/bookings/:bookingId/cancel',
  checkRole(['carrier', 'independent_driver']),
  checkPermission('loads.cancel'),
  LoadsController.cancelBooking,
);

// Counter offers (both broker and carrier side)
loadRoutes.post(
  '/:id/counteroffer',
  checkRole(['broker', 'carrier', 'independent_driver']),
  LoadsController.submitCounterOffer,
);
loadRoutes.post(
  '/:id/counteroffer/:offerId/accept',
  checkRole(['broker', 'carrier', 'independent_driver']),
  LoadsController.acceptCounterOffer,
);

// Truck requests
loadRoutes.post('/:id/truck-request', checkRole(['broker']), LoadsController.createTruckRequest);
loadRoutes.post(
  '/:id/truck-request/:reqId/confirm',
  checkRole(['carrier']),
  LoadsController.confirmTruckRequest,
);
loadRoutes.post(
  '/:id/truck-request/:reqId/deny',
  checkRole(['carrier']),
  LoadsController.denyTruckRequest,
);
