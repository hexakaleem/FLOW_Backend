import { Router } from 'express';
import { MarketplaceController } from './marketplace.controller';
import { verifyJWT, checkRole, checkPermission } from '../../middleware/rbac';

export const marketplaceRoutes = Router();

// All marketplace routes require authentication
marketplaceRoutes.use(verifyJWT);

// Marketplace view: broker, carrier, independent driver (with loads.view)
marketplaceRoutes.get(
  '/loads',
  checkRole(['broker', 'carrier', 'independent_driver']),
  checkPermission('loads.view'),
  MarketplaceController.searchLoads,
);

// Truck search: broker only
marketplaceRoutes.get('/trucks', checkRole(['broker']), MarketplaceController.searchTrucks);

// Saved searches: carrier and independent driver
marketplaceRoutes.post(
  '/saved-searches',
  checkRole(['carrier', 'independent_driver']),
  MarketplaceController.saveSearch,
);
marketplaceRoutes.get(
  '/saved-searches',
  checkRole(['carrier', 'independent_driver']),
  MarketplaceController.listSavedSearches,
);
marketplaceRoutes.delete(
  '/saved-searches/:id',
  checkRole(['carrier', 'independent_driver']),
  MarketplaceController.deleteSavedSearch,
);

// Preferred lanes: carrier and independent driver
marketplaceRoutes.post(
  '/lanes',
  checkRole(['carrier', 'independent_driver']),
  MarketplaceController.setPreferredLane,
);
marketplaceRoutes.get(
  '/lanes',
  checkRole(['carrier', 'independent_driver']),
  MarketplaceController.listPreferredLanes,
);
marketplaceRoutes.delete(
  "/lanes/:id",
  checkRole(["carrier", "independent_driver"]),
  MarketplaceController.deletePreferredLane,
);

// My Bookings: carrier and independent driver
marketplaceRoutes.get(
  "/bookings",
  checkRole(["carrier", "independent_driver"]),
  MarketplaceController.listMyBookings,
);
