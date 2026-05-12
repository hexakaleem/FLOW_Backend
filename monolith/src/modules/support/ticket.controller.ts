import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '@flow/shared';
import { TicketService } from './ticket.service';

export class TicketController {
  static async createTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { loadId, subject, description, category, priority } = req.body;
      const userId = req.auth!.userId;
      const orgId = req.auth!.companyId || '';

      const ticket = await TicketService.createTicket(
        userId,
        orgId,
        loadId || null,
        subject,
        description,
        category,
        priority || 'medium',
      );

      const body: ApiResponse = { success: true, data: ticket };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const status = req.query.status as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await TicketService.getTickets(userId, status, page, limit);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const ticket = await TicketService.getTicket(req.params.id, userId);
      const replies = await TicketService.getReplies(req.params.id);
      const body: ApiResponse = { success: true, data: { ticket, replies } };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async addReply(req: Request, res: Response, next: NextFunction) {
    try {
      const { content } = req.body;
      const userId = req.auth!.userId;
      const reply = await TicketService.addReply(req.params.id, userId, content);
      const body: ApiResponse = { success: true, data: reply };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const userId = req.auth!.userId;
      const ticket = await TicketService.updateStatus(req.params.id, userId, status);
      const body: ApiResponse = { success: true, data: ticket };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}
