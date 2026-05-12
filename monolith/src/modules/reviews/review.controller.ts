import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '@flow/shared';
import { ReviewService } from './review.service';

export class ReviewController {
  static async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { revieweeId, revieweeOrgId, loadId, rating, communication, punctuality, professionalism, comment } = req.body;
      const reviewerId = req.auth!.userId;
      const reviewerOrgId = req.auth!.companyId || '';

      const review = await ReviewService.createReview(
        reviewerId,
        reviewerOrgId,
        revieweeId,
        revieweeOrgId,
        loadId,
        rating,
        communication,
        punctuality,
        professionalism,
        comment || null,
      );

      const body: ApiResponse = { success: true, data: review };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await ReviewService.getReviewsForUser(userId, page, limit);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getReviewForLoad(req: Request, res: Response, next: NextFunction) {
    try {
      const { loadId } = req.params;
      const review = await ReviewService.getReviewForLoad(loadId);
      const body: ApiResponse = { success: true, data: review };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}
