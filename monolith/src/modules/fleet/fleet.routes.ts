import { Router } from 'express';
import { FleetController } from './fleet.controller';
import { checkRole, checkPermission } from '../../middleware/rbac';

export const fleetRoutes = Router();

fleetRoutes.post(
  '/trucks',
  checkRole(['carrier', 'independent_driver']),
  checkPermission('fleet.manage'),
  FleetController.createTruck,
);
fleetRoutes.get(
  '/trucks/available',
  checkRole(['carrier', 'independent_driver', 'company_driver']),
  checkPermission('fleet.view'),
  FleetController.getAvailableTrucks,
);
fleetRoutes.get(
  '/trucks',
  checkRole(['carrier', 'independent_driver', 'company_driver']),
  checkPermission('fleet.view'),
  FleetController.listTrucks,
);
fleetRoutes.get(
  '/trucks/:id',
  checkRole(['carrier', 'independent_driver', 'company_driver']),
  checkPermission('fleet.view'),
  FleetController.getTruck,
);
fleetRoutes.patch(
  '/trucks/:id',
  checkRole(['carrier', 'independent_driver']),
  checkPermission('fleet.manage'),
  FleetController.updateTruck,
);
fleetRoutes.delete(
  '/trucks/:id',
  checkRole(['carrier', 'independent_driver']),
  checkPermission('fleet.manage'),
  FleetController.decommissionTruck,
);
fleetRoutes.post(
  '/trucks/:id/vin-decode',
  checkRole(['carrier', 'independent_driver']),
  checkPermission('fleet.manage'),
  FleetController.decodeVin,
);
fleetRoutes.get(
  '/vin-decode/:vin',
  checkRole(['carrier', 'independent_driver']),
  checkPermission('fleet.manage'),
  FleetController.standaloneVinDecode,
);
fleetRoutes.patch(
  '/trucks/:id/assign-driver',
  checkRole(['carrier', 'independent_driver']),
  checkPermission('fleet.assign_drivers'),
  FleetController.assignDriver,
);
fleetRoutes.patch(
  '/trucks/:id/assign-gps',
  checkRole(['carrier', 'independent_driver']),
  checkPermission('fleet.manage'),
  FleetController.assignGps,
);

fleetRoutes.post(
  '/trailers',
  checkRole(['carrier', 'independent_driver']),
  checkPermission('fleet.manage'),
  FleetController.createTrailer,
);
fleetRoutes.get(
  '/trailers',
  checkRole(['carrier', 'independent_driver', 'company_driver']),
  checkPermission('fleet.view'),
  FleetController.listTrailers,
);
fleetRoutes.patch(
  '/trailers/:id/assign-truck',
  checkRole(['carrier', 'independent_driver']),
  checkPermission('fleet.manage'),
  FleetController.assignTrailerToTruck,
);

fleetRoutes.get(
  '/compliance',
  checkRole(['carrier', 'independent_driver']),
  checkPermission('fleet.view'),
  FleetController.getCompliance,
);
fleetRoutes.patch(
  '/compliance/:driverId',
  checkRole(['carrier']),
  checkPermission('fleet.manage'),
  FleetController.updateCompliance,
);

fleetRoutes.post(
  '/drivers/location',
  checkRole(['carrier', 'independent_driver', 'company_driver']),
  FleetController.updateDriverLocation,
);
