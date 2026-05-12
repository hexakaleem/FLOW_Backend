import { Schema, Document, Types } from 'mongoose';
import { usersDb } from '../../../lib/mongo';

export interface IReview extends Document {
  reviewerId: string;
  reviewerOrgId: string;
  revieweeId: string;
  revieweeOrgId: string;
  loadId: string;
  rating: number;
  communication: number;
  punctuality: number;
  professionalism: number;
  comment: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    reviewerId: { type: String, required: true, index: true },
    reviewerOrgId: { type: String, required: true },
    revieweeId: { type: String, required: true, index: true },
    revieweeOrgId: { type: String, required: true },
    loadId: { type: String, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    communication: { type: Number, required: true, min: 1, max: 5 },
    punctuality: { type: Number, required: true, min: 1, max: 5 },
    professionalism: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: null },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true },
);

reviewSchema.index({ revieweeId: 1, createdAt: -1 });
reviewSchema.index({ loadId: 1 }, { unique: true, partialFilterExpression: { loadId: { $exists: true } } });

export const ReviewModel = usersDb.model<IReview>('Review', reviewSchema);
