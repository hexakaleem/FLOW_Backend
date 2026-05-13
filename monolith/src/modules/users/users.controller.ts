import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '@flow/shared';
import { ProfileService } from './profile.service';
import { PermissionService } from './permission.service';
import { TeamService } from './team.service';
import { RoleService } from './role.service';

export class UsersController {
  static async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const targetUserId = req.params.id;
      const requestingUserId = req.auth!.userId;
      await ProfileService.deleteAccount(targetUserId, req.body.password, requestingUserId);
      const body: ApiResponse = { success: true, data: { message: 'Account deleted' } };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const filters = req.query as { search?: string; role?: string };
      const users = await ProfileService.listUsers(companyId, filters);
      const body: ApiResponse = { success: true, data: users };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async listRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const roles = await RoleService.getRolesForOrg(companyId);
      const body: ApiResponse = { success: true, data: roles };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProfileService.getProfile(req.params.id);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProfileService.updateProfile(req.params.id, req.body);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async createBusinessProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProfileService.createBusinessProfile(req.params.id, req.body);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const permissions = await PermissionService.getPermissions(req.params.id);
      const body: ApiResponse = { success: true, data: { permissions } };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async listMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const { search, role, status } = req.query as Record<string, string | undefined>;
      const result = await TeamService.listMembers(companyId, { search, role, status });
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const inviterId = req.auth!.userId;
      const { email, roleId } = req.body;
      const result = await TeamService.inviteMember(companyId, inviterId, email, roleId);
      const body: ApiResponse = { success: true, data: result };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async acceptInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth?.userId;
      const { token } = req.body;
      const result = await TeamService.acceptInvite(token, userId);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async cancelInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const { inviteId } = req.params;
      const result = await TeamService.cancelInvite(inviteId, companyId);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const { name, permissions } = req.body;
      const result = await RoleService.createRole(companyId, name, permissions);
      const body: ApiResponse = { success: true, data: result };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const { roleId } = req.params;
      const { permissions } = req.body;
      const result = await RoleService.updateRole(roleId, companyId, permissions);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async deleteRole(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const { roleId } = req.params;
      const { reassignToRoleId } = req.body;
      const result = await RoleService.deleteRole(roleId, companyId, reassignToRoleId);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async updateMember(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const { memberId } = req.params;
      const result = await TeamService.updateMember(memberId, companyId, req.body);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const { memberId } = req.params;
      const result = await TeamService.removeMember(memberId, companyId);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}
