import type { Role } from '../enums/Roles';

export interface JwtClaims {
  userId: string;
  role: Role;
  companyId: string | null;
  permissions: string[];
  verified: boolean;
  isOnboardingComplete: boolean;
  stripeConnected: boolean;
  identityStatus: string | null;
  iat?: number;
  exp?: number;
}
