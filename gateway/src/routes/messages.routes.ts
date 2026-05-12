import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { forwardToMonolith } from '../lib/proxy';

const router = Router();

router.get('/conversations', authenticate, forwardToMonolith);
router.get('/conversations/:conversationId/messages', authenticate, forwardToMonolith);
router.post('/send', authenticate, forwardToMonolith);
router.put('/conversations/:conversationId/read', authenticate, forwardToMonolith);
router.get('/unread-count', authenticate, forwardToMonolith);

export { router as messageRoutes };
