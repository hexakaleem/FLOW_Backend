import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../modules/auth/token.service';
import { AppError } from '../lib/errors';
import { ROLES, Role } from '@flow/shared';

// Extend Express Request to carry auth context
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: Role;
        companyId: string | null;
        permissions: string[];
        verified: boolean;
        isOnboardingComplete: boolean;
      };
    }
  }
}

/**
 * verifyJWT — validates the Bearer token, extracts claims, attaches to req.auth
 * Must be used on ALL protected routes EXCEPT auth routes (login, register, etc.)
 */
export function verifyJWT(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or invalid Authorization header');
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const claims = TokenService.verifyAccessToken(token);

    if (TokenService.isTokenBlacklisted(token)) {
      throw AppError.unauthorized('Token has been revoked');
    }

    req.auth = {
      userId: claims.userId,
      role: claims.role as Role,
      companyId: claims.companyId || null,
      permissions: claims.permissions || [],
      verified: claims.verified || false,
      isOnboardingComplete: claims.isOnboardingComplete || false,
    };

    next();
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized(err?.message || 'Invalid token');
  }
}

/**
 * checkRole — ensures req.auth.role is in the allowed list
 */
export function checkRole(allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw AppError.unauthorized('Authentication required');
    }

    if (!allowedRoles.includes(req.auth.role)) {
      throw AppError.forbidden(
        `Role '${req.auth.role}' is not authorized for this resource`
      );
    }

    next();
  };
}

/**
 * checkPermission — ensures req.auth.permissions includes the required permission
 * For Carrier team members who have limited permissions
 */
export function checkPermission(requiredPermission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw AppError.unauthorized('Authentication required');
    }

    // Carrier owner and admin have full permissions implicitly
    if (req.auth.role === ROLES.CARRIER || req.auth.role === ROLES.ADMIN) {
      return next();
    }

    // Broker has full broker-related permissions implicitly
    if (req.auth.role === ROLES.BROKER) {
      return next();
    }

    // For carrier team members and drivers, check the permissions array
    if (!req.auth.permissions.includes(requiredPermission)) {
      throw AppError.forbidden(
        `Missing required permission: ${requiredPermission}`
      );
    }

    next();
  };
}

/**
 * checkOwnership — ensures the resource being accessed belongs to the user's company
 * This is a factory that takes a function to extract the resource's companyId
 */
export function checkOwnership(getResourceCompanyId: (req: Request) => Promise<string | null>) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      throw AppError.unauthorized('Authentication required');
    }

    // Admin can see everything
    if (req.auth.role === ROLES.ADMIN) {
      return next();
    }

    // Independent drivers don't have companies
    if (req.auth.role === ROLES.INDEPENDENT_DRIVER) {
      return next();
    }

    const resourceCompanyId = await getResourceCompanyId(req);

    // If the resource has no company (e.g., public marketplace loads), allow
    if (!resourceCompanyId) {
      return next();
    }

    // The resource must belong to the user's company
    if (resourceCompanyId !== req.auth.companyId) {
      throw AppError.forbidden('Resource does not belong to your company');
    }

    next();
  };
}

/**
 * requireVerified — ensures the user is verified before allowing access
 */
export function requireVerified(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    throw AppError.unauthorized('Authentication required');
  }

  if (!req.auth.verified && req.auth.role !== ROLES.ADMIN) {
    throw AppError.forbidden('Account verification required to access this resource');
  }

  next();
}
