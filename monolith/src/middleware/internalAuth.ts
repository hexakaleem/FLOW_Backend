import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-internal-key'] as string | undefined;

  if (!apiKey || apiKey !== config.internalApiKey) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Internal API key required',
      },
    });
    return;
  }

  const orgId = req.headers['x-user-org-id'] as string | undefined;
  const userId = req.headers['x-user-id'] as string | undefined;
  const userRole = req.headers['x-user-role'] as string | undefined;
  const verified = req.headers['x-user-verified'] as string | undefined;

  if (orgId) (req as unknown as Record<string, unknown>).orgId = orgId;
  if (userId) (req as unknown as Record<string, unknown>).userId = userId;
  if (userRole) (req as unknown as Record<string, unknown>).userRole = userRole;
  if (verified) (req as unknown as Record<string, unknown>).verified = verified === 'true';

  next();
}
