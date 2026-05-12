import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';

export class AnalyticsController {
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const data = await AnalyticsService.getSummary(companyId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
