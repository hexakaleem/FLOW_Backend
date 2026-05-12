import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { forwardToMonolith } from '../lib/proxy';

const router = Router();

router.get('/', authenticate, forwardToMonolith);
router.put('/mark-all-read', authenticate, forwardToMonolith);
router.delete('/:id', authenticate, forwardToMonolith);
router.get('/unread-count', authenticate, forwardToMonolith);

export { router as notificationRoutes };
