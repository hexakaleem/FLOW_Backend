import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { forwardToMonolith } from '../lib/proxy';

const router = Router();

router.post('/', authenticate, forwardToMonolith);
router.get('/', authenticate, forwardToMonolith);
router.get('/:id', authenticate, forwardToMonolith);
router.post('/:id/reply', authenticate, forwardToMonolith);
router.patch('/:id/status', authenticate, forwardToMonolith);

export { router as ticketRoutes };
