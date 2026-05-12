import { Router } from 'express';
import { UsersController } from './users.controller';

export const teamRoutes = Router();

teamRoutes.get('/', UsersController.listMembers);
teamRoutes.get('/members', UsersController.listMembers);
teamRoutes.post('/members', UsersController.inviteMember);
teamRoutes.post('/invite', UsersController.inviteMember);
teamRoutes.post('/accept-invite', UsersController.acceptInvite);
teamRoutes.get('/roles', UsersController.listRoles);
teamRoutes.post('/roles', UsersController.createRole);
teamRoutes.put('/roles/:roleId', UsersController.updateRole);
teamRoutes.delete('/roles/:roleId', UsersController.deleteRole);
teamRoutes.patch('/members/:memberId', UsersController.updateMember);
teamRoutes.delete('/members/:memberId', UsersController.removeMember);
