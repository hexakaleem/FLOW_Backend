import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { forwardToMonolith } from '../lib/proxy';

const router = Router();

router.get('/summary', authenticate, requirePermission('analytics:read'), forwardToMonolith);

export { router as analyticsRoutes };
