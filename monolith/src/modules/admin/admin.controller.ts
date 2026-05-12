import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '@flow/shared';
import { AdminService } from './admin.service';

export class AdminController {
  static async listPendingVerifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, method, page, limit } = req.query as Record<string, string>;
      const result = await AdminService.listPendingVerifications({
        status: status || 'submitted',
        method: method as 'fmcsa' | 'manual' | undefined,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async approveIdentity(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.auth!.userId;
      const result = await AdminService.approveIdentity(req.params.userId, adminId);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async rejectIdentity(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.auth!.userId;
      const { reason } = req.body;
      const result = await AdminService.rejectIdentity(req.params.userId, adminId, reason);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getUserDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.getUserDocuments(req.params.userId);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async listAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, role, page, limit } = req.query as Record<string, string>;
      const result = await AdminService.listAllUsers({
        status,
        role,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async suspendUser(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.auth!.userId;
      const result = await AdminService.suspendUser(req.params.userId, adminId);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async reactivateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.auth!.userId;
      const result = await AdminService.reactivateUser(req.params.userId, adminId);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}