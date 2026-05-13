import { Request, Response, NextFunction } from 'express';
import { JwtClaims } from '@flow/shared';
import { ServiceFactory } from '../factory/ServiceFactory';
import { IAuthProvider } from '../interfaces/IAuthProvider';

declare global {
  namespace Express {
    interface Request {
      user: JwtClaims;
    }
  }
}

const authProvider: IAuthProvider = ServiceFactory.createAuthProvider();

const introspectCache = new Map<string, { claims: JwtClaims; expiresAt: number }>();
const INTROSPECT_TTL_MS = 60_000;

const permissionsCache = new Map<string, { permissions: string[]; expiresAt: number }>();
const PERMISSIONS_TTL_MS = 300_000;

export const PUBLIC_ROUTES = new Set([
  '/register',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/refresh',
]);

export const ONBOARDING_ROUTES = new Set([
  '/onboarding/profile',
  '/onboarding/business',
  '/onboarding/stripe',
  '/onboarding/prefs',
  '/onboarding/driver',
  '/onboarding/carrier',
  '/onboarding/broker',
  '/me',
  '/logout',
]);

function isPathInSet(path: string, set: Set<string>): boolean {
  for (const route of set) {
    if (path.startsWith(route)) {
      return true;
    }
  }
  return false;
}

function hashToken(token: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data[i]) | 0;
  }
  return String(hash);
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (isPathInSet(req.path, PUBLIC_ROUTES)) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Authorization token is required' },
      });
      return;
    }

    const token = authHeader.slice(7);
    const tokenHash = hashToken(token);

    let claims: JwtClaims;
    const cached = introspectCache.get(tokenHash);

    if (cached && cached.expiresAt > Date.now()) {
      claims = cached.claims;
    } else {
      claims = await authProvider.introspect(token);
      introspectCache.set(tokenHash, { claims, expiresAt: Date.now() + INTROSPECT_TTL_MS });
    }

    req.user = claims;

    const isBusinessProfileRoute = /\/[a-f0-9-]+\/business-profile/.test(req.path);
    const isAllowedDuringOnboarding = isPathInSet(req.path, ONBOARDING_ROUTES) || isBusinessProfileRoute;

    if (!claims.isOnboardingComplete && !isAllowedDuringOnboarding) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ONBOARDING_REQUIRED',
          message: 'Please complete your onboarding profile to access this feature',
        },
      });
      return;
    }

    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' },
    });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient role' },
      });
      return;
    }

    next();
  };
}

export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    try {
      // 1. Try to use permissions already in the JWT claims
      let permissions = req.user.permissions || [];

      // 2. If not in JWT or empty, try the cache or fetch from monolith
      if (permissions.length === 0) {
        const userId = req.user.userId;
        const cached = permissionsCache.get(userId);
        if (cached && cached.expiresAt > Date.now()) {
          permissions = cached.permissions;
        } else {
          permissions = await authProvider.getPermissions(userId);
          permissionsCache.set(userId, { permissions, expiresAt: Date.now() + PERMISSIONS_TTL_MS });
        }
      }

      if (!permissions.includes(permission)) {
        console.warn(`[GATEWAY] Permission denied: '${permission}' for user ${req.user.userId}`);
        res.status(403).json({
          success: false,
          error: {
            code: 'MISSING_PERMISSION',
            message: `Required permission '${permission}' is not granted`,
          },
        });
        return;
      }

      next();
    } catch (error: any) {
      console.error('[GATEWAY] Permission check failed:', error);
      res.status(403).json({
        success: false,
        error: { 
          code: 'MISSING_PERMISSION', 
          message: error.message || 'Could not verify permissions' 
        },
      });
    }
  };
}
