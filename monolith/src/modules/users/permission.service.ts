import { ROLE_DEFAULT_PERMISSIONS } from '@flow/shared';
import { permissionCache } from '../../lib/cache';
import { MembershipModel } from './models/membership.model';
import { RoleModel } from './models/role.model';

export class PermissionService {
  static async getPermissions(userId: string, userRole?: string): Promise<string[]> {
    const cacheKey = `perm:${userId}`;
    const cached = permissionCache.get<string[]>(cacheKey);
    if (cached) return cached;

    try {
      const membership = await MembershipModel.findOne({ userId, status: 'active' });
      if (!membership) {
        // Fall back to default role permissions
        const defaults = ROLE_DEFAULT_PERMISSIONS[userRole || ''] || [];
        permissionCache.set(cacheKey, defaults, 300);
        return defaults;
      }

      const role = await RoleModel.findById(membership.roleId);
      if (!role) {
        const defaults = ROLE_DEFAULT_PERMISSIONS[userRole || ''] || [];
        permissionCache.set(cacheKey, defaults, 300);
        return defaults;
      }

      const permissions = role.permissions ?? [];
      permissionCache.set(cacheKey, permissions, 300);
      return permissions;
    } catch (err) {
      const defaults = ROLE_DEFAULT_PERMISSIONS[userRole || ''] || [];
      return defaults;
    }
  }

  static invalidateCache(userId: string): void {
    const cacheKey = `perm:${userId}`;
    permissionCache.delete(cacheKey);
  }

  static async invalidateCacheForRole(orgId: string, roleId: string): Promise<void> {
    const memberships = await MembershipModel.find({ orgId, roleId });
    for (const membership of memberships) {
      permissionCache.delete(`perm:${membership.userId}`);
    }
  }
}
