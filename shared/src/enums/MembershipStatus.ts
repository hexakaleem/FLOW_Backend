export const MEMBERSHIP_STATUSES = ['active', 'pending', 'inactive'] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];
