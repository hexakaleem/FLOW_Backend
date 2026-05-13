import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { forwardToMonolith } from '../lib/proxy';

const router = Router();

// Middleware to allow access if it's the user's own resource OR they have the required permission
const requireSelfOrPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.userId === req.params.id) {
      return next();
    }
    return requirePermission(permission)(req, res, next);
  };
};

router.get('/', authenticate, requirePermission('user:read'), forwardToMonolith);
router.get('/:id', authenticate, requireSelfOrPermission('user:read'), forwardToMonolith);
router.patch('/:id', authenticate, requireSelfOrPermission('user:update'), forwardToMonolith);
router.post(
  '/:id/business-profile',
  authenticate,
  requireSelfOrPermission('user:update'),
  forwardToMonolith,
);
router.delete('/:id', authenticate, forwardToMonolith);
router.get('/:id/permissions', authenticate, requireSelfOrPermission('user:read'), forwardToMonolith);

export { router as userRoutes };
