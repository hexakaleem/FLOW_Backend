import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { forwardToMonolith } from '../lib/proxy';

const router = Router();

router.post('/', authenticate, forwardToMonolith);
router.get('/user/:userId', authenticate, forwardToMonolith);
router.get('/load/:loadId', authenticate, forwardToMonolith);

export { router as reviewRoutes };
