import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { forwardToMonolith } from '../lib/proxy';

const router = Router();

router.post('/register', authenticate, forwardToMonolith);
router.post('/unregister', authenticate, forwardToMonolith);

export { router as deviceRoutes };
