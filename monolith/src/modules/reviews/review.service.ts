import { Types } from 'mongoose';
import { ReviewModel, IReview } from './models/review.model';
import { AppError } from '../../lib/errors';

export class ReviewService {
  static async createReview(
    reviewerId: string,
    reviewerOrgId: string,
    revieweeId: string,
    revieweeOrgId: string,
    loadId: string,
    rating: number,
    communication: number,
    punctuality: number,
    professionalism: number,
    comment: string | null,
  ): Promise<IReview> {
    const existing = await ReviewModel.findOne({ loadId, reviewerId });
    if (existing) {
      throw AppError.conflict('REVIEW_EXISTS', 'You already reviewed this load');
    }

    return ReviewModel.create({
      reviewerId,
      reviewerOrgId,
      revieweeId,
      revieweeOrgId,
      loadId,
      rating,
      communication,
      punctuality,
      professionalism,
      comment,
    });
  }

  static async getReviewsForUser(userId: string, page = 1, limit = 20): Promise<{ reviews: IReview[]; total: number; avgRating: number }> {
    const [reviews, total, avgResult] = await Promise.all([
      ReviewModel.find({ revieweeId: userId, isPublic: true })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ReviewModel.countDocuments({ revieweeId: userId, isPublic: true }),
      ReviewModel.aggregate([
        { $match: { revieweeId: userId, isPublic: true } },
        { $group: { _id: null, avg: { $avg: '$rating' } } },
      ]),
    ]);

    const avgRating = avgResult.length > 0 ? Math.round(avgResult[0].avg * 10) / 10 : 0;

    return { reviews: reviews as unknown as IReview[], total, avgRating };
  }

  static async getReviewForLoad(loadId: string): Promise<IReview | null> {
    return ReviewModel.findOne({ loadId });
  }
}
