import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '@flow/shared';
import { AuthService } from './auth.service';
import { AppError } from '../../lib/errors';

export class AuthController {
  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(userId, currentPassword, newPassword);
      const body: ApiResponse = { success: true, data: { message: 'Password changed' } };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      const body: ApiResponse = { success: true, data: result };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.login(req.body);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      // Accept refresh token from body (gateway proxy) OR cookies (direct access)
      const bodyToken = req.body?.refreshToken as string | undefined;
      const cookieToken = (req.cookies as Record<string, string> | undefined)?.refreshToken;
      const refreshToken = bodyToken || cookieToken;
      const result = await AuthService.refresh(refreshToken);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = (req.headers.authorization ?? '').replace('Bearer ', '');
      await AuthService.logout(token);
      const body: ApiResponse = { success: true, data: null };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await AuthService.forgotPassword(req.body.email);
      const body: ApiResponse = {
        success: true,
        data: { message: 'If the email exists, an OTP has been sent' },
      };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await AuthService.resetPassword(req.body);
      const body: ApiResponse = {
        success: true,
        data: { message: 'Password reset successfully' },
      };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.verifyEmail(req.body.token);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async verifyIdentity(req: Request, res: Response, next: NextFunction) {
    try {
      const files = (req.files ?? []) as { buffer: Buffer; mimetype: string }[];
      const userId = req.auth!.userId;
      const verificationMethod = (req.body.verificationMethod === 'manual' ? 'manual' : 'fmcsa') as
        | 'fmcsa'
        | 'manual';
      const result = await AuthService.verifyIdentity(userId, files, verificationMethod);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const result = await AuthService.getMe(userId);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async introspect(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.body.token || req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new AppError(401, 'TOKEN_MISSING', 'Token is required for introspection');
      }
      const result = await AuthService.introspect(token);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async completeProfileOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const result = await AuthService.completeProfileOnboarding(userId, req.body);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async completeBusinessOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const result = await AuthService.completeBusinessOnboarding(userId, req.body);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async completeStripeOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const result = await AuthService.completeStripeOnboarding(userId, req.body);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async completePreferenceOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const result = await AuthService.completePreferenceOnboarding(userId, req.body);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}
