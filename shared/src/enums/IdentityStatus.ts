export const IDENTITY_STATUSES = ['pending', 'submitted', 'approved', 'rejected'] as const;

export type IdentityStatus = (typeof IDENTITY_STATUSES)[number];
