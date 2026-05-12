import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import type { JwtClaims } from '@flow/shared';
import { config } from '../../config';
import { tokenBlacklist } from '../../lib/cache';
import { AppError } from '../../lib/errors';
import { UserModel } from './models/user.model';

export class TokenService {
  static signAccessToken(claims: Omit<JwtClaims, 'iat' | 'exp'>): string {
    return jwt.sign(claims as object, config.jwt.privateKey, {
      algorithm: 'HS256',
      expiresIn: config.jwt.accessTokenTTL,
    });
  }

  static verifyAccessToken(token: string): JwtClaims {
    return jwt.verify(token, config.jwt.privateKey, {
      algorithms: ['HS256'],
    }) as JwtClaims;
  }

  static generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  static async rotateRefreshToken(userId: string, oldTokenHash: string): Promise<string> {
    const newToken = TokenService.generateRefreshToken();
    const newHash = TokenService.hashToken(newToken);

    const result = await UserModel.findOneAndUpdate(
      {
        _id: userId,
        refreshTokenHash: oldTokenHash,
      },
      {
        refreshTokenHash: newHash,
        refreshTokenExpiresAt: new Date(Date.now() + config.jwt.refreshTokenTTL * 1000),
      },
      { new: true },
    );

    if (!result) {
      await UserModel.updateOne(
        { _id: userId },
        { refreshTokenHash: null, refreshTokenExpiresAt: null },
      );
      throw new AppError(401, 'TOKEN_REUSE', 'Security alert: session invalidated');
    }

    return newToken;
  }

  static isTokenBlacklisted(token: string): boolean {
    const hash = TokenService.hashToken(token);
    return tokenBlacklist.has(hash);
  }

  static blacklistToken(token: string): void {
    const hash = TokenService.hashToken(token);
    let ttl = config.jwt.accessTokenTTL;

    try {
      const decoded = jwt.decode(token) as { exp?: number } | null;
      if (decoded?.exp) {
        const remaining = decoded.exp - Math.floor(Date.now() / 1000);
        if (remaining > 0) ttl = remaining;
      }
    } catch {
      void 0;
    }

    tokenBlacklist.set(hash, true, ttl);
  }
}
