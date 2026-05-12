import { Router } from 'express';
import { ReviewController } from './review.controller';

export const reviewRoutes = Router();

reviewRoutes.post('/', ReviewController.createReview);
reviewRoutes.get('/user/:userId', ReviewController.getReviews);
reviewRoutes.get('/load/:loadId', ReviewController.getReviewForLoad);
