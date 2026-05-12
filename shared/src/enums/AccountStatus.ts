export const ACCOUNT_STATUSES = [
  'pending_onboarding',
  'pending_verification',
  'active',
  'suspended',
  'deactivated',
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
