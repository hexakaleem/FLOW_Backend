import { Router } from 'express';
import { AdminController } from './admin.controller';
import { checkRole } from '../../middleware/rbac';

export const adminRoutes = Router();

adminRoutes.get(
  '/verifications',
  checkRole(['admin']),
  AdminController.listPendingVerifications,
);

adminRoutes.post(
  '/verifications/:userId/approve',
  checkRole(['admin']),
  AdminController.approveIdentity,
);

adminRoutes.post(
  '/verifications/:userId/reject',
  checkRole(['admin']),
  AdminController.rejectIdentity,
);

adminRoutes.get(
  '/verifications/:userId/documents',
  checkRole(['admin']),
  AdminController.getUserDocuments,
);

adminRoutes.get('/users', checkRole(['admin']), AdminController.listAllUsers);

adminRoutes.post(
  '/users/:userId/suspend',
  checkRole(['admin']),
  AdminController.suspendUser,
);

adminRoutes.post(
  '/users/:userId/reactivate',
  checkRole(['admin']),
  AdminController.reactivateUser,
);