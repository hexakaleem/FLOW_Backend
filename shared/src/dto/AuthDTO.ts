export interface RegisterDTO {
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  email: string;
  otp: string;
  newPassword: string;
}

export interface VerifyEmailDTO {
  token: string;
}

export interface OnboardingProfileDTO {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface OnboardingBusinessDTO {
  companyName?: string;
  mcNumber?: string;
  dotNumber?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface OnboardingStripeDTO {
  stripeAccountId: string;
}

export interface OnboardingPrefsDTO {
  equipmentTypes?: string[];
  notificationPreferences?: Record<string, string[]>;
}
