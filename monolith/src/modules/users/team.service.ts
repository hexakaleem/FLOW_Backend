import { randomBytes } from 'crypto';
import type { UpdateMemberDTO } from '@flow/shared';
import { AppError } from '../../lib/errors';
import { sendEmail } from '../../lib/email';
import { OrganizationModel } from './models/organization.model';
import { RoleModel } from './models/role.model';
import { MembershipModel } from './models/membership.model';
import { InviteModel } from './models/invite.model';
import { PermissionService } from './permission.service';
import { ProfileModel } from './models/profile.model';

export class TeamService {
  static async listMembers(
    orgId: string,
    filters?: { search?: string; role?: string; status?: string },
  ) {
    const query: Record<string, unknown> = { orgId };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.search) {
      const matchingProfiles = await ProfileModel.find({
        $or: [
          { email: { $regex: filters.search, $options: 'i' } },
          { firstName: { $regex: filters.search, $options: 'i' } },
          { lastName: { $regex: filters.search, $options: 'i' } },
        ],
      }).select('userId');
      const userIds = matchingProfiles.map((p) => p.userId);
      query.userId = { $in: userIds };
    }

    if (filters?.role) {
      const matchingRoles = await RoleModel.find({
        orgId,
        name: { $regex: filters.role, $options: 'i' },
      }).select('_id');
      const roleIds = matchingRoles.map((r) => r._id.toString());
      query.roleId = { $in: roleIds };
    }

    const memberships = await MembershipModel.find(query).sort({ joinedAt: -1 }).lean();

    const userIds = memberships.map((m) => m.userId);
    const roleIds = [...new Set(memberships.map((m) => m.roleId))];

    const [profiles, roles] = await Promise.all([
      ProfileModel.find({ userId: { $in: userIds } }).lean(),
      RoleModel.find({ _id: { $in: roleIds } }).lean(),
    ]);

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));
    const roleMap = new Map(roles.map((r) => [r._id.toString(), r]));

    return memberships.map((m) => ({
      id: m._id.toString(),
      userId: m.userId,
      roleId: m.roleId,
      status: m.status,
      joinedAt: m.joinedAt,
      profile: profileMap.get(m.userId) ?? null,
      role: roleMap.get(m.roleId) ?? null,
    }));
  }

  static async inviteMember(orgId: string, inviterId: string, email: string, roleId: string) {
    const role = await RoleModel.findOne({ _id: roleId, orgId });
    if (!role) {
      throw AppError.notFound('Role', roleId);
    }

    const existingMember = await MembershipModel.findOne({
      orgId,
      userId: { $exists: true },
      status: 'active',
    });

    if (existingMember) {
      const existingProfile = await ProfileModel.findOne({
        userId: existingMember.userId,
        email,
      });
      if (existingProfile) {
        throw AppError.conflict(
          'ALREADY_MEMBER',
          'This email is already an active member of the organization',
        );
      }
    }

    const existingActiveByEmail = await ProfileModel.findOne({ email });
    if (existingActiveByEmail) {
      const duplicateMembership = await MembershipModel.findOne({
        orgId,
        userId: existingActiveByEmail.userId,
        status: 'active',
      });
      if (duplicateMembership) {
        throw AppError.conflict(
          'ALREADY_MEMBER',
          'This email is already an active member of the organization',
        );
      }
    }

    const pendingInvite = await InviteModel.findOne({
      orgId,
      email,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });
    if (pendingInvite) {
      throw AppError.conflict('PENDING_INVITE', 'A pending invite already exists for this email');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await InviteModel.create({
      orgId,
      invitedBy: inviterId,
      email,
      roleId,
      token,
      status: 'pending',
      expiresAt,
    });

    const org = await OrganizationModel.findById(orgId);
    sendEmail('team_invite', email, {
      orgName: org?.name ?? 'Organization',
      token,
    });

    return invite;
  }

  static async acceptInvite(token: string, userId?: string) {
    const invite = await InviteModel.findOne({ token });

    if (!invite) {
      throw AppError.notFound('Invite', token);
    }

    if (invite.status !== 'pending') {
      throw AppError.badRequest('INVITE_NOT_PENDING', 'This invite is no longer pending');
    }

    if (new Date() > invite.expiresAt) {
      await InviteModel.updateOne({ _id: invite._id }, { $set: { status: 'expired' } });
      throw new AppError(410, 'INVITE_EXPIRED', 'This invite has expired');
    }

    if (!userId) {
      // New user needs to register first - return invite details for the signup flow
      return { requiresRegistration: true, email: invite.email, token: invite.token };
    }
    const effectiveUserId = userId;

    const existingMembership = await MembershipModel.findOne({
      userId: effectiveUserId,
      orgId: invite.orgId,
      status: 'active',
    });
    if (existingMembership) {
      throw AppError.conflict('ALREADY_MEMBER', 'You are already a member of this organization');
    }

    const membership = await MembershipModel.create({
      userId: effectiveUserId,
      orgId: invite.orgId,
      roleId: invite.roleId,
      status: 'active',
    });

    await InviteModel.updateOne({ _id: invite._id }, { $set: { status: 'accepted' } });

    PermissionService.invalidateCache(effectiveUserId);

    return membership;
  }

  static async updateMember(memberId: string, orgId: string, dto: UpdateMemberDTO) {
    const membership = await MembershipModel.findOne({ _id: memberId, orgId });
    if (!membership) {
      throw AppError.notFound('Membership', memberId);
    }

    if (dto.roleId) {
      const role = await RoleModel.findOne({ _id: dto.roleId, orgId });
      if (!role) {
        throw AppError.notFound('Role', dto.roleId);
      }
      membership.roleId = dto.roleId;
    }

    await membership.save();

    PermissionService.invalidateCache(membership.userId);

    return membership;
  }

  static async removeMember(memberId: string, orgId: string) {
    const membership = await MembershipModel.findOne({ _id: memberId, orgId });
    if (!membership) {
      throw AppError.notFound('Membership', memberId);
    }

    const ownerRole = await RoleModel.findOne({ orgId, name: 'Owner', isSystem: true });
    if (ownerRole && membership.roleId === ownerRole._id.toString()) {
      const ownerCount = await MembershipModel.countDocuments({
        orgId,
        roleId: ownerRole._id.toString(),
        status: 'active',
      });

      if (ownerCount <= 1) {
        throw AppError.badRequest('LAST_OWNER', 'Cannot remove the last owner of the organization');
      }
    }

    membership.status = 'inactive';
    await membership.save();

    PermissionService.invalidateCache(membership.userId);

    return membership;
  }
}
