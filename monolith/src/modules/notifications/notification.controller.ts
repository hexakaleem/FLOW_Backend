import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '@flow/shared';
import { NotificationService } from './notification.service';

export class NotificationController {
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await NotificationService.getNotifications(userId, page, limit);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const ids = req.body.ids as string[] | undefined;
      await NotificationService.markAsRead(userId, ids);
      const body: ApiResponse = { success: true, data: { marked: true } };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const { id } = req.params;
      await NotificationService.deleteNotification(userId, id);
      const body: ApiResponse = { success: true, data: { deleted: true } };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const { unreadCount } = await NotificationService.getNotifications(userId, 1, 1);
      const body: ApiResponse = { success: true, data: { unreadCount } };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}
