import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '@flow/shared';
import { MessageService } from './message.service';

export class MessageController {
  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { loadId, recipientId, content, attachments } = req.body;
      const senderId = req.auth!.userId;
      const senderOrgId = req.auth!.companyId || '';

      const message = await MessageService.sendMessage(
        loadId || null,
        senderId,
        senderOrgId,
        recipientId,
        '',
        content,
        attachments || [],
      );

      const body: ApiResponse = { success: true, data: message };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const conversations = await MessageService.getConversations(userId);
      const body: ApiResponse = { success: true, data: conversations };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await MessageService.getMessages(conversationId, limit);
      const body: ApiResponse = { success: true, data: messages };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId } = req.params;
      const userId = req.auth!.userId;
      await MessageService.markAsRead(conversationId, userId);
      const body: ApiResponse = { success: true, data: { marked: true } };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const count = await MessageService.getUnreadCount(userId);
      const body: ApiResponse = { success: true, data: { count } };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}
