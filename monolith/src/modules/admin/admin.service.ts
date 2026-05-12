import { AppError } from '../../lib/errors';
import { UserModel } from '../auth/models/user.model';

interface ListFilters {
  status?: string;
  method?: 'fmcsa' | 'manual';
  page?: number;
  limit?: number;
}

interface UserListFilters extends ListFilters {
  role?: string;
}

export class AdminService {
  static async listPendingVerifications(filters: ListFilters) {
    const { status = 'submitted', method, page = 1, limit = 20 } = filters;

    const query: Record<string, unknown> = { identityStatus: status };
    if (method) {
      query.verificationMethod = method;
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      UserModel.find(query, { passwordHash: 0, refreshTokenHash: 0, refreshTokenExpiresAt: 0 })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(query),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        hasMore: skip + users.length < total,
      },
    };
  }

  static async approveIdentity(userId: string, adminId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw AppError.notFound('User', userId);
    }

    if (user.identityStatus === 'approved') {
      throw AppError.badRequest('ALREADY_APPROVED', 'User identity is already approved');
    }

    user.identityStatus = 'approved';
    user.identityVerified = true;
    user.status = 'active';
    await user.save();

    return {
      userId: user._id.toString(),
      identityStatus: user.identityStatus,
      identityVerified: user.identityVerified,
      status: user.status,
      approvedBy: adminId,
    };
  }

  static async rejectIdentity(userId: string, adminId: string, reason?: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw AppError.notFound('User', userId);
    }

    user.identityStatus = 'rejected';
    user.identityVerified = false;
    await user.save();

    return {
      userId: user._id.toString(),
      identityStatus: user.identityStatus,
      identityVerified: user.identityVerified,
      rejectedBy: adminId,
      reason: reason || 'No reason provided',
    };
  }

  static async getUserDocuments(userId: string) {
    const user = await UserModel.findById(
      userId,
      { verificationDocuments: 1, identityStatus: 1, identityVerified: 1, verificationMethod: 1 },
    );
    if (!user) {
      throw AppError.notFound('User', userId);
    }

    return {
      userId: user._id.toString(),
      identityStatus: user.identityStatus,
      identityVerified: user.identityVerified,
      verificationMethod: user.verificationMethod,
      documents: user.verificationDocuments,
    };
  }

  static async listAllUsers(filters: UserListFilters) {
    const { status, role, page = 1, limit = 20 } = filters;

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (role) query.role = role;

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      UserModel.find(query, { passwordHash: 0, refreshTokenHash: 0, refreshTokenExpiresAt: 0 })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(query),
    ]);

    return {
      data: users,
      meta: { page, limit, total, hasMore: skip + users.length < total },
    };
  }

  static async suspendUser(userId: string, adminId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw AppError.notFound('User', userId);
    }

    if (user.status === 'suspended') {
      throw AppError.badRequest('ALREADY_SUSPENDED', 'User is already suspended');
    }

    user.status = 'suspended';
    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;
    await user.save();

    return {
      userId: user._id.toString(),
      status: user.status,
      suspendedBy: adminId,
    };
  }

  static async reactivateUser(userId: string, adminId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw AppError.notFound('User', userId);
    }

    if (user.status === 'active') {
      throw AppError.badRequest('ALREADY_ACTIVE', 'User is already active');
    }

    user.status = 'active';
    await user.save();

    return {
      userId: user._id.toString(),
      status: user.status,
      reactivatedBy: adminId,
    };
  }
}