import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';

export const analyticsRoutes = Router();

analyticsRoutes.get('/summary', AnalyticsController.getSummary);
