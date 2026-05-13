import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface SocketUser {
  userId: string;
  email: string;
  role: string;
  orgId: string | null;
}

export async function verifySocketToken(token: string): Promise<SocketUser | null> {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as {
      userId: string;
      email?: string;
      role: string;
      companyId?: string;
    };

    return {
      userId: decoded.userId,
      email: decoded.email || '',
      role: decoded.role,
      orgId: decoded.companyId || null,
    };
  } catch {
    return null;
  }
}
