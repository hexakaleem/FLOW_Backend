import { ROLE_DEFAULT_PERMISSIONS } from '@flow/shared';
import { UserModel } from '../auth/models/user.model';
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
      
      let roleToUse = userRole;
      if (!roleToUse) {
        const user = await UserModel.findById(userId).select('role');
        roleToUse = user?.role;
      }

      // 1. Get system-wide default permissions for the user's primary role
      const defaults = ROLE_DEFAULT_PERMISSIONS[roleToUse || ''] || [];

      // 2. If no membership, return defaults
      if (!membership) {
        permissionCache.set(cacheKey, defaults, 300);
        return defaults;
      }

      // 3. Get company-level role permissions
      const role = await RoleModel.findById(membership.roleId);
      const rolePermissions = role?.permissions ?? [];

      // 4. Merge permissions (System Defaults + Company Role)
      // This ensures Brokers always have 'load:create' even if their membership is 'Driver'
      const combinedPermissions = Array.from(new Set([...defaults, ...rolePermissions]));

      // 5. If user is a system admin, they get EVERYTHING regardless
      if (roleToUse === 'admin') {
        const allPerms = [...Object.values(ROLE_DEFAULT_PERMISSIONS).flat()];
        const uniqueAllPerms = Array.from(new Set(allPerms));
        permissionCache.set(cacheKey, uniqueAllPerms, 300);
        return uniqueAllPerms;
      }

      permissionCache.set(cacheKey, combinedPermissions, 300);
      return combinedPermissions;
    } catch (err) {
      const user = await UserModel.findById(userId).select('role');
      const defaults = ROLE_DEFAULT_PERMISSIONS[user?.role || ''] || [];
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
