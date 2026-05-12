import { Router } from 'express';
import { UsersController } from './users.controller';

export const userRoutes = Router();

userRoutes.get('/', UsersController.listUsers);
userRoutes.delete('/:id', UsersController.deleteAccount);
userRoutes.get('/:id', UsersController.getProfile);
userRoutes.patch('/:id', UsersController.updateProfile);
userRoutes.post('/:id/business-profile', UsersController.createBusinessProfile);
userRoutes.get('/:id/permissions', UsersController.getPermissions);
