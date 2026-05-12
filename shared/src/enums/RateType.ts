export const RATE_TYPES = ['per_mile', 'per_trip', 'per_hour', 'per_hundred_weight'] as const;

export type RateType = (typeof RATE_TYPES)[number];
