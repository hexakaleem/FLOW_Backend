export const ONBOARDING_STEPS = ['profile', 'business', 'stripe', 'preferences'] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
