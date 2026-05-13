import { randomBytes } from 'crypto';
import axios from 'axios';
import type { RegisterDTO, LoginDTO, ResetPasswordDTO, JwtClaims } from '@flow/shared';
import { sanitizeEmail, isValidPassword } from '@flow/shared';
import { config } from '../../config';
import { AppError } from '../../lib/errors';
import { sendEmail } from '../../lib/email';
import { otpCache } from '../../lib/cache';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { EventBus } from '../../events/EventBus';
import { UserModel, IUser } from './models/user.model';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { ProfileService, PermissionService } from '../users';

const safeUserProjection = {
  passwordHash: 0,
  refreshTokenHash: 0,
  refreshTokenExpiresAt: 0,
};

export class AuthService {
  static async register(dto: RegisterDTO) {
    const email = sanitizeEmail(dto.email);

    const emailAlreadyExists = await UserModel.exists({ email });
    if (emailAlreadyExists) {
      throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
    }

    if (!isValidPassword(dto.password)) {
      throw new AppError(
        400,
        'WEAK_PASSWORD',
        'Password must be at least 8 characters with upper, lower, and a digit',
      );
    }

    const passwordHash = await PasswordService.hash(dto.password);

    const emailVerifyToken = randomBytes(32).toString('hex');
    const emailVerifyTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await UserModel.create({
      email,
      passwordHash,
      role: dto.role,
      firstName: dto.firstName,
      lastName: dto.lastName,
      emailVerifyToken,
      emailVerifyTokenExpiresAt,
      status: 'pending_onboarding',
    });

    // Create profile and organization for the user
    try {
      await ProfileService.createProfile(
        user._id.toString(),
        undefined,
        user.email,
        dto.firstName,
        dto.lastName,
        dto.role,
      );
    } catch (e: any) {
      console.error('Profile creation during registration failed:', e?.message || e);
    }

    await sendEmail('welcome', user.email, {
      firstName: user.firstName,
      verifyToken: emailVerifyToken,
    });

    // Automatically send OTP for email verification
    try {
      await AuthService.sendVerificationOTP(user.email);
    } catch (e: any) {
      console.error('Failed to send verification OTP during registration:', e?.message || e);
      // Non-blocking: user can resend OTP later
    }

    // Emit user:registered domain event
    setImmediate(() => {
      EventBus.publish({
        type: 'user:registered',
        payload: {
          userId: user._id.toString(),
          email: user.email,
          role: user.role,
        },
        timestamp: new Date().toISOString(),
      }).catch(() => { });
    });

    return { userId: user._id.toString(), email: user.email, role: user.role };
  }

  static async login(dto: LoginDTO) {
    const email = sanitizeEmail(dto.email);

    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (user.status === 'suspended' || user.status === 'deactivated') {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Account is not active');
    }

    const passwordValid = await PasswordService.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    let companyId: string | null = null;
    let permissions: string[] = [];

    try {
      const profile = await ProfileService.getProfile(user._id.toString());
      if (profile && (profile as any).orgId) {
        companyId = (profile as any).orgId.toString();
      }
    } catch (e: any) {
      console.error('Profile fetch during login failed:', e?.message || e);
      // Profile might not exist yet — companyId stays null
    }

    // Fetch permissions for the user (all roles)
    try {
      permissions = await PermissionService.getPermissions(user._id.toString(), user.role);
    } catch (e: any) {
      console.error('Permission fetch during login failed:', e?.message || e);
      // Fall back to empty permissions if fetch fails
      permissions = [];
    }

    const accessToken = TokenService.signAccessToken({
      userId: user._id.toString(),
      companyId,
      permissions,
      role: user.role,
      verified: user.emailVerified,
      isOnboardingComplete: user.isOnboardingComplete,
      stripeConnected: user.stripeAccountStatus === 'connected',
      identityStatus: user.identityStatus,
    });

    const refreshToken = TokenService.generateRefreshToken();
    const refreshTokenHash = TokenService.hashToken(refreshToken);
    const refreshTokenExpiresAt = new Date(Date.now() + config.jwt.refreshTokenTTL * 1000);

    await UserModel.findOneAndUpdate(
      { _id: user._id },
      {
        refreshTokenHash,
        refreshTokenExpiresAt,
        lastLoginAt: new Date(),
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isOnboardingComplete: user.isOnboardingComplete,
      },
    };
  }

  static async refresh(refreshTokenCookie: string | undefined) {
    if (!refreshTokenCookie) {
      throw new AppError(401, 'NO_REFRESH_TOKEN', 'Refresh token is required');
    }

    const tokenHash = TokenService.hashToken(refreshTokenCookie);

    const user = await UserModel.findOne({ refreshTokenHash: tokenHash });
    if (!user) {
      throw new AppError(401, 'INVALID_REFRESH', 'Invalid refresh token');
    }

    if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
      throw new AppError(401, 'INVALID_REFRESH', 'Refresh token expired');
    }

    const newRefreshToken = await TokenService.rotateRefreshToken(user._id.toString(), tokenHash);

    let companyId: string | null = null;
    let permissions: string[] = [];

    try {
      const profile = await ProfileService.getProfile(user._id.toString());
      if (profile && (profile as any).orgId) {
        companyId = (profile as any).orgId.toString();
      }
    } catch (e: any) {
      console.error('Profile fetch during refresh failed:', e?.message || e);
      // ignore
    }

    // Fetch permissions for the user (all roles)
    try {
      permissions = await PermissionService.getPermissions(user._id.toString(), user.role);
    } catch (e: any) {
      console.error('Permission fetch during refresh failed:', e?.message || e);
      permissions = [];
    }

    const accessToken = TokenService.signAccessToken({
      userId: user._id.toString(),
      companyId,
      permissions,
      role: user.role,
      verified: user.emailVerified,
      isOnboardingComplete: user.isOnboardingComplete,
      stripeConnected: user.stripeAccountStatus === 'connected',
      identityStatus: user.identityStatus,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  static async logout(accessToken: string): Promise<void> {
    TokenService.blacklistToken(accessToken);

    let userId: string | undefined;
    try {
      const decoded = TokenService.verifyAccessToken(accessToken);
      userId = decoded.userId;
    } catch (e: any) {
      console.error('Token verification during logout failed:', e?.message || e);
      void 0;
    }

    if (userId) {
      await UserModel.updateOne(
        { _id: userId },
        { refreshTokenHash: null, refreshTokenExpiresAt: null },
      );
    }
  }

  static async forgotPassword(emailInput: string) {
    const email = sanitizeEmail(emailInput);
    const user = await UserModel.findOne({ email });
    if (!user) return;

    const { code, hash } = PasswordService.generateOTP();
    const otpHash = await hash;
    otpCache.set(`reset:${user._id}`, otpHash, 600);
    await sendEmail('password_reset', user.email, { otp: code });
  }

  static async resetPassword(dto: ResetPasswordDTO) {
    const email = sanitizeEmail(dto.email);
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const storedOtpHash = otpCache.get<string>(`reset:${user._id}`);
    if (!storedOtpHash) {
      throw new AppError(400, 'OTP_EXPIRED', 'OTP has expired or was not requested');
    }

    const otpIsValid = await PasswordService.validateOTP(dto.otp, storedOtpHash);
    if (!otpIsValid) {
      throw new AppError(400, 'INVALID_OTP', 'The OTP is incorrect');
    }

    const newPasswordHash = await PasswordService.hash(dto.newPassword);

    await UserModel.updateOne(
      { _id: user._id },
      {
        passwordHash: newPasswordHash,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    );

    otpCache.delete(`reset:${user._id}`);
  }

  static async sendVerificationOTP(emailInput: string) {
    const email = sanitizeEmail(emailInput);
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }
    if (user.emailVerified) {
      throw new AppError(400, 'ALREADY_VERIFIED', 'Email is already verified');
    }

    const { code, hash } = PasswordService.generateOTP();
    const otpHash = await hash;
    otpCache.set(`verify:${email}`, otpHash, 600); // 10 minutes

    await sendEmail('email_verification', user.email, {
      firstName: user.firstName,
      otp: code,
    });

    return { message: 'Verification code sent' };
  }

  static async verifyOTP(emailInput: string, code: string) {
    const email = sanitizeEmail(emailInput);
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }
    if (user.emailVerified) {
      throw new AppError(400, 'ALREADY_VERIFIED', 'Email is already verified');
    }

    const storedOtpHash = otpCache.get<string>(`verify:${email}`);
    if (!storedOtpHash) {
      throw new AppError(400, 'OTP_EXPIRED', 'OTP has expired or was not requested');
    }

    const otpIsValid = await PasswordService.validateOTP(code, storedOtpHash);
    if (!otpIsValid) {
      throw new AppError(400, 'INVALID_OTP', 'The OTP is incorrect');
    }

    user.emailVerified = true;
    user.emailVerifyToken = null;
    user.emailVerifyTokenExpiresAt = null;
    await user.save();

    otpCache.delete(`verify:${email}`);

    return { userId: user._id.toString(), email: user.email };
  }

  static async verifyEmail(token: string) {
    const user = await UserModel.findOne({
      emailVerifyToken: token,
      emailVerifyTokenExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError(400, 'INVALID_TOKEN', 'Email verification token is invalid or expired');
    }

    user.emailVerified = true;
    user.emailVerifyToken = null;
    user.emailVerifyTokenExpiresAt = null;
    await user.save();

    return { userId: user._id.toString(), email: user.email };
  }

  static async verifyIdentity(
    userId: string,
    files: { buffer: Buffer; mimetype: string }[],
  ) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const result = await uploadToCloudinary(file.buffer, { folder: 'flow/verification' });
        return { url: result.url, type: file.mimetype };
      }),
    );

    user.verificationDocuments = [...user.verificationDocuments, ...uploadResults];
    user.verificationMethod = 'manual';
    user.identityStatus = 'submitted';
    user.status = 'pending_verification';
    await user.save();

    return {
      identityStatus: user.identityStatus,
      identityVerified: user.identityVerified,
      verificationMethod: user.verificationMethod,
    };
  }

  static async getMe(userId: string) {
    const user = await UserModel.findById(userId, safeUserProjection);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }
    return user;
  }

  static async introspect(token: string): Promise<JwtClaims> {
    if (TokenService.isTokenBlacklisted(token)) {
      throw new AppError(401, 'TOKEN_REVOKED', 'Token has been revoked');
    }

    const claims = TokenService.verifyAccessToken(token);

    // Refresh claims from DB so the gateway always has up-to-date state
    try {
      const user = await UserModel.findById(claims.userId).select(
        'emailVerified isOnboardingComplete identityStatus stripeAccountStatus',
      );
      if (user) {
        claims.verified = user.emailVerified;
        claims.isOnboardingComplete = user.isOnboardingComplete;
        claims.identityStatus = user.identityStatus;
        claims.stripeConnected = user.stripeAccountStatus === 'connected';
      }
    } catch (e: any) {
      console.error('User fetch during introspect failed:', e?.message || e);
    }

    if (!claims.companyId || !claims.permissions || claims.permissions.length === 0) {
      try {
        if (!claims.companyId) {
          const profile = await ProfileService.getProfile(claims.userId);
          if (profile && (profile as any).orgId) {
            (claims as any).companyId = (profile as any).orgId.toString();
          }
        }

        if (!claims.permissions || claims.permissions.length === 0) {
          (claims as any).permissions = await PermissionService.getPermissions(
            claims.userId,
            claims.role,
          );
        }
      } catch (e: any) {
        console.error('Context hydration during introspect failed:', e?.message || e);
      }
    }

    return claims;
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    const valid = await PasswordService.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
    if (!isValidPassword(newPassword))
      throw new AppError(
        400,
        'WEAK_PASSWORD',
        'Password must be at least 8 characters with upper, lower, and a digit',
      );
    user.passwordHash = await PasswordService.hash(newPassword);
    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;
    await user.save();
  }

  static async completeProfileOnboarding(userId: string, body: Record<string, unknown>) {
    const update: Record<string, unknown> = { 'onboardingSteps.profile': true };
    if (body.firstName) update.firstName = body.firstName;
    if (body.lastName) update.lastName = body.lastName;

    const user = await UserModel.findOneAndUpdate({ _id: userId }, update, { new: true });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

    // Also update the Profile document
    try {
      const profileUpdate: Record<string, unknown> = {};
      if (body.firstName) profileUpdate.firstName = body.firstName;
      if (body.lastName) profileUpdate.lastName = body.lastName;
      if (body.phone) profileUpdate.phone = body.phone;
      if (Object.keys(profileUpdate).length > 0) {
        await ProfileService.updateProfile(userId, profileUpdate as any);
      }
    } catch (e: any) {
      console.error('Profile update during onboarding failed:', e?.message || e);
    }

    return AuthService.finalizeOnboardingStep(user, userId);
  }

  static async completeBusinessOnboarding(userId: string, body: Record<string, unknown>) {
    const user = await UserModel.findOneAndUpdate(
      { _id: userId },
      { 'onboardingSteps.business': true },
      { new: true },
    );
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

    // Create/update the organization with business details
    try {
      const profile = await ProfileService.getProfile(userId);
      if (profile && (profile as any).orgId) {
        const orgUpdate: Record<string, unknown> = {};
        if (body.companyName) orgUpdate['name'] = body.companyName;
        if (body.mcNumber) orgUpdate['mcNumber'] = body.mcNumber;
        if (body.dotNumber) orgUpdate['dotNumber'] = body.dotNumber;

        if (body.address) {
          const addr = body.address as any;
          orgUpdate['address'] = {
            line1: addr.line1 || '',
            line2: addr.line2 || '',
            city: addr.city || '',
            state: addr.state || '',
            zip: addr.zip || '',
          };
        }

        if (Object.keys(orgUpdate).length > 0) {
          const { OrganizationModel } = await import('../users/models/organization.model');
          await OrganizationModel.findOneAndUpdate(
            { _id: (profile as any).orgId },
            { $set: orgUpdate },
            { runValidators: true }
          );
        }
      }
    } catch (e: any) {
      console.error('Business profile update during onboarding failed:', e?.message || e);
    }

    return AuthService.finalizeOnboardingStep(user, userId);
  }

  static async completeStripeOnboarding(userId: string, body: Record<string, unknown>) {
    const update: Record<string, unknown> = { 'onboardingSteps.stripe': true };
    if (body.stripeAccountId) {
      update.stripeAccountId = body.stripeAccountId;
      update.stripeAccountStatus = 'pending';
    }
    const user = await UserModel.findOneAndUpdate({ _id: userId }, update, { new: true });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    return AuthService.finalizeOnboardingStep(user, userId);
  }

  static async completePreferenceOnboarding(userId: string, _body: Record<string, unknown>) {
    const user = await UserModel.findOneAndUpdate(
      { _id: userId },
      { 'onboardingSteps.preferences': true },
      { new: true },
    );
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    return AuthService.finalizeOnboardingStep(user, userId);
  }

  private static async finalizeOnboardingStep(user: IUser, userId: string) {
    const steps = user.onboardingSteps;
    const allStepsComplete = steps.profile && steps.business && steps.stripe && steps.preferences;

    if (allStepsComplete && !user.isOnboardingComplete) {
      await UserModel.updateOne(
        { _id: user._id },
        { isOnboardingComplete: true },
      );
      user.isOnboardingComplete = true;
    }

    // If onboarding just completed, issue a fresh JWT
    let accessToken: string | undefined;
    if (allStepsComplete) {
      let companyId: string | null = null;
      let permissions: string[] = [];
      try {
        const profile = await ProfileService.getProfile(userId);
        if (profile && (profile as any).orgId) {
          companyId = (profile as any).orgId.toString();
        }
      } catch { /* ignore */ }
      try {
        permissions = await PermissionService.getPermissions(userId, user.role);
      } catch { /* ignore */ }

      accessToken = TokenService.signAccessToken({
        userId: user._id.toString(),
        companyId,
        permissions,
        role: user.role,
        verified: user.emailVerified,
        isOnboardingComplete: true,
        stripeConnected: user.stripeAccountStatus === 'connected',
        identityStatus: user.identityStatus,
      });
    }

    return {
      onboardingSteps: user.onboardingSteps,
      isOnboardingComplete: allStepsComplete || user.isOnboardingComplete,
      accessToken,
    };
  }
  static async promoteToAdminBySecret(email: string, secret: string) {
    const configSecret = process.env.ADMIN_PROMOTION_SECRET;
    if (!configSecret || secret !== configSecret) {
      throw new AppError(403, 'INVALID_SECRET', 'Unauthorized');
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    user.role = 'admin' as any;
    await user.save();

    return { success: true, email: user.email, role: user.role };
  }
}
