import { PERMISSIONS_ARRAY } from '@flow/shared';
import { AppError } from '../../lib/errors';
import { RoleModel } from './models/role.model';
import { MembershipModel } from './models/membership.model';
import { PermissionService } from './permission.service';

export class RoleService {
  static async createRole(orgId: string, name: string, permissions: string[]) {
    const existing = await RoleModel.findOne({ orgId, name });
    if (existing) {
      throw AppError.conflict(
        'ROLE_EXISTS',
        `A role named "${name}" already exists in this organization`,
      );
    }

    RoleService.validatePermissions(permissions);

    return RoleModel.create({
      orgId,
      name,
      permissions,
      isSystem: false,
    });
  }

  static async updateRole(roleId: string, orgId: string, permissions: string[]) {
    const role = await RoleModel.findOne({ _id: roleId, orgId });
    if (!role) {
      throw AppError.notFound('Role', roleId);
    }

    if (role.isSystem) {
      throw AppError.badRequest('SYSTEM_ROLE_IMMUTABLE', 'System roles cannot be modified');
    }

    RoleService.validatePermissions(permissions);

    role.permissions = permissions;
    await role.save();

    await PermissionService.invalidateCacheForRole(orgId, roleId);

    return role;
  }

  static async deleteRole(roleId: string, orgId: string, reassignToRoleId?: string) {
    const role = await RoleModel.findOne({ _id: roleId, orgId });
    if (!role) {
      throw AppError.notFound('Role', roleId);
    }

    if (role.isSystem) {
      throw AppError.badRequest('SYSTEM_ROLE_IMMUTABLE', 'System roles cannot be deleted');
    }

    const memberCount = await MembershipModel.countDocuments({
      orgId,
      roleId,
      status: 'active',
    });

    if (memberCount > 0) {
      if (!reassignToRoleId) {
        throw AppError.conflict(
          'ROLE_HAS_MEMBERS',
          'Cannot delete a role that has active members. Provide reassignToRoleId to reassign members first.',
        );
      }

      // Validate the target role exists and belongs to the same org
      const targetRole = await RoleModel.findOne({ _id: reassignToRoleId, orgId });
      if (!targetRole) {
        throw AppError.notFound('Role', reassignToRoleId);
      }

      // Reassign all members to the new role
      await MembershipModel.updateMany(
        { orgId, roleId, status: 'active' },
        { $set: { roleId: reassignToRoleId } },
      );

      // Invalidate cache for all affected users
      await PermissionService.invalidateCacheForRole(orgId, roleId);
    }

    await RoleModel.deleteOne({ _id: roleId });

    return { deleted: true, reassignedCount: memberCount };
  }

  static async getRolesForOrg(orgId: string) {
    return RoleModel.find({ orgId }).sort({ isSystem: -1, name: 1 });
  }

  static getMasterPermissionRegistry(): string[] {
    return [...PERMISSIONS_ARRAY];
  }

  private static validatePermissions(permissions: string[]): void {
    const masterSet = new Set<string>(PERMISSIONS_ARRAY);
    for (const perm of permissions) {
      if (!masterSet.has(perm)) {
        throw AppError.badRequest('INVALID_PERMISSION', `Invalid permission: ${perm}`);
      }
    }
  }
}
