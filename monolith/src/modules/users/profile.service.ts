import type { UpdateProfileDTO, BusinessProfileDTO } from '@flow/shared';
import bcrypt from 'bcrypt';
import { AppError } from '../../lib/errors';
import { ProfileModel } from './models/profile.model';
import { OrganizationModel } from './models/organization.model';
import { RoleModel } from './models/role.model';
import { MembershipModel } from './models/membership.model';
import { UserModel } from '../auth/models/user.model';

// Internal company-level role definitions (Carrier team management)
// These are distinct from the system-wide ROLES enum
import { PERMISSIONS } from '@flow/shared';

const CARRIER_SYSTEM_ROLES: Record<string, { name: string; permissions: string[] }> = {
  owner: {
    name: 'Owner',
    permissions: Object.values(PERMISSIONS),
  },
  dispatcher: {
    name: 'Dispatcher',
    permissions: [
      PERMISSIONS.LOADS_VIEW,
      PERMISSIONS.LOADS_BOOK,
      PERMISSIONS.LOADS_CANCEL,
      PERMISSIONS.FLEET_VIEW,
      PERMISSIONS.FLEET_ASSIGN_DRIVERS,
      PERMISSIONS.DOCUMENTS_VIEW,
      PERMISSIONS.DOCUMENTS_UPLOAD,
    ],
  },
  driver: {
    name: 'Driver',
    permissions: [
      PERMISSIONS.LOADS_VIEW,
      PERMISSIONS.FLEET_VIEW,
      PERMISSIONS.DOCUMENTS_VIEW,
      PERMISSIONS.DOCUMENTS_UPLOAD,
    ],
  },
};

export class ProfileService {
  static async createProfile(
    userId: string,
    orgId: string | undefined,
    email: string,
    firstName: string,
    lastName: string,
    role: string,
  ) {
    let effectiveOrgId = orgId;

    if (!effectiveOrgId) {
      const org = await OrganizationModel.create({
        name: `${firstName} ${lastName} Operations`,
        ownerId: userId,
        address: {
          line1: '',
          city: '',
          state: '',
          zip: '',
        },
      });
      effectiveOrgId = org._id.toString();

      // Create default company-level roles (Owner, Dispatcher, Driver)
      const roleCreations = Object.entries(CARRIER_SYSTEM_ROLES).map(([_key, config]) =>
        RoleModel.create({
          orgId: effectiveOrgId,
          name: config.name,
          permissions: config.permissions,
          isSystem: true,
        }),
      );
      await Promise.all(roleCreations);
    }

    const profile = await ProfileModel.create({
      userId,
      orgId: effectiveOrgId,
      email,
      firstName,
      lastName,
    });

    // Map system-wide role to company-level role name
    const companyRoleName =
      role === 'carrier'
        ? 'Owner'
        : role === 'company_driver'
          ? 'Driver'
          : role === 'independent_driver'
            ? 'Driver'
            : 'Driver';

    const assignedRole = await RoleModel.findOne({
      orgId: effectiveOrgId,
      name: companyRoleName,
    });

    await MembershipModel.create({
      userId,
      orgId: effectiveOrgId,
      roleId: assignedRole?._id.toString() ?? '',
      status: 'active',
    });

    return profile;
  }

  static async deleteAccount(targetUserId: string, password: string, requestingUserId: string) {
    if (targetUserId !== requestingUserId) {
      throw new AppError(403, 'FORBIDDEN', 'You can only delete your own account');
    }

    const user = await UserModel.findById(targetUserId);
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(400, 'INVALID_PASSWORD', 'Incorrect password');

    user.status = 'deactivated';
    await user.save();
  }

  static async getProfile(userId: string) {
    const profile = await ProfileModel.findOne({ userId });
    if (!profile) {
      throw AppError.notFound('Profile', userId);
    }
    return profile;
  }

  static async updateProfile(userId: string, dto: UpdateProfileDTO) {
    const allowedFields: (keyof UpdateProfileDTO)[] = [
      'firstName',
      'lastName',
      'phone',
      'timezone',
      'avatar',
      'notificationPreferences',
    ];
    const update: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        update[field] = dto[field];
      }
    }

    const profile = await ProfileModel.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!profile) {
      throw AppError.notFound('Profile', userId);
    }
    return profile;
  }

  static async createBusinessProfile(userId: string, dto: BusinessProfileDTO) {
    const profile = await ProfileModel.findOne({ userId });
    if (!profile) {
      throw AppError.notFound('Profile', userId);
    }

    const org = await OrganizationModel.findOneAndUpdate(
      { _id: profile.orgId },
      {
        $set: {
          name: dto.companyName,
          mcNumber: dto.mcNumber ?? null,
          dotNumber: dto.dotNumber ?? null,
          scacCode: dto.scacCode ?? null,
          factoringCompany: dto.factoringCompany ?? null,
          address: dto.address,
        },
      },
      { new: true },
    );

    if (!org) {
      throw AppError.notFound('Organization', profile.orgId);
    }

    return { profile, organization: org };
  }

  static async listUsers(orgId: string, filters?: { search?: string; role?: string }) {
    const query: Record<string, unknown> = { orgId };
    if (filters?.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [{ firstName: searchRegex }, { lastName: searchRegex }, { email: searchRegex }];
    }
    if (filters?.role) {
      query.role = filters.role;
    }
    return ProfileModel.find(query).limit(100);
  }

  static async getOrgById(orgId: string) {
    return OrganizationModel.findById(orgId);
  }

  static getDefaultPermissionsForRole(role: string): string[] {
    // Map system-wide role to default permissions
    switch (role) {
      case 'carrier':
      case 'admin':
        return Object.values(PERMISSIONS);
      case 'broker':
        return [PERMISSIONS.LOADS_VIEW, PERMISSIONS.DOCUMENTS_VIEW, PERMISSIONS.DOCUMENTS_UPLOAD];
      case 'independent_driver':
        return [
          PERMISSIONS.LOADS_VIEW,
          PERMISSIONS.LOADS_BOOK,
          PERMISSIONS.LOADS_CANCEL,
          PERMISSIONS.FLEET_VIEW,
          PERMISSIONS.DOCUMENTS_VIEW,
          PERMISSIONS.DOCUMENTS_UPLOAD,
        ];
      case 'company_driver':
        return [
          PERMISSIONS.LOADS_VIEW,
          PERMISSIONS.FLEET_VIEW,
          PERMISSIONS.DOCUMENTS_VIEW,
          PERMISSIONS.DOCUMENTS_UPLOAD,
        ];
      default:
        return [];
    }
  }
}
