import { Request, Response, NextFunction } from 'express';
import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

type UserContext = {
  userId: string;
  companyId: string;
  role: string;
  verified: boolean;
  isOnboardingComplete: boolean;
  permissions?: string[];
};

const http: AxiosInstance = axios.create({
  baseURL: config.monolithUrl,
  timeout: 30000,
  headers: {
    'X-Internal-Key': config.internalApiKey,
    'Content-Type': 'application/json',
  },
});

function buildHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Internal-Key': config.internalApiKey,
  };

  const user = (req as unknown as { user?: UserContext }).user;
  if (user) {
    headers['X-User-Id'] = user.userId;
    headers['X-User-Org-Id'] = user.companyId;
    headers['X-User-Role'] = user.role;
    headers['X-User-Verified'] = String(!!user.verified);
    headers['X-User-Onboarding-Complete'] = String(!!user.isOnboardingComplete);
    if (user.permissions) {
      headers['X-User-Permissions'] = user.permissions.join(',');
    }
  }

  // Forward the original Authorization header so the monolith's verifyJWT
  // middleware can validate the token on auth-protected routes (/me, /logout, etc.)
  const authorization = req.headers.authorization;
  if (authorization) {
    headers['Authorization'] = authorization;
  }

  const contentType = req.headers['content-type'];
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  return headers;
}

export async function forwardToMonolith(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Use the path WITHOUT the query string. req.originalUrl includes
    // the full URL with query params. If we pass the full URL (with ?key=val)
    // AND params: req.query, axios merges them, producing duplicate params
    // like ?key=val&key=val. Express parses duplicate keys as arrays,
    // breaking ALL filters since MongoDB receives arrays instead of strings.
    const rawPath = req.originalUrl.startsWith('/api/')
      ? req.originalUrl.slice(4)
      : req.originalUrl;
    const pathOnly = rawPath.split('?')[0];

        const response = await http.request({
      method: req.method as 'GET',
      url: pathOnly,
      params: req.query,
      data: req.body,
      headers: buildHeaders(req),
    });

    res.status(response.status).json(response.data);
  } catch (error: unknown) {
    const axiosError = error as { response?: { status: number; data: unknown } };
    if (axiosError.response) {
      res.status(axiosError.response.status).json(axiosError.response.data);
      return;
    }
    next(error);
  }
}
