import { Schema, Document } from 'mongoose';
import {
  ROLES_ARRAY,
  Role,
  ACCOUNT_STATUSES,
  AccountStatus,
  IDENTITY_STATUSES,
  IdentityStatus,
} from '@flow/shared';
import { authDb } from '../../../lib/mongo';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: Role;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  emailVerifyToken: string | null;
  emailVerifyTokenExpiresAt: Date | null;
  identityVerified: boolean;
  identityStatus: IdentityStatus | null;
  verificationMethod: 'fmcsa' | 'manual' | null;
  verificationDocuments: { url: string; type: string }[];
  stripeAccountId: string | null;
  stripeAccountStatus: 'pending' | 'connected' | null;
  isOnboardingComplete: boolean;
  onboardingSteps: {
    profile: boolean;
    business: boolean;
    stripe: boolean;
    preferences: boolean;
  };
  refreshTokenHash: string | null;
  refreshTokenExpiresAt: Date | null;
  lastLoginAt: Date | null;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

const verificationDocumentSchema = new Schema(
  {
    url: { type: String, required: true },
    type: { type: String, required: true },
  },
  { _id: false },
);

const onboardingStepsSchema = new Schema(
  {
    profile: { type: Boolean, default: false },
    business: { type: Boolean, default: false },
    stripe: { type: Boolean, default: false },
    preferences: { type: Boolean, default: false },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ROLES_ARRAY,
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, default: null },
    emailVerifyTokenExpiresAt: { type: Date, default: null },
    identityVerified: { type: Boolean, default: false },
    identityStatus: {
      type: String,
      enum: [...IDENTITY_STATUSES, null],
      default: null,
    },
    verificationDocuments: {
      type: [verificationDocumentSchema],
      default: [],
    },
    verificationMethod: {
      type: String,
      enum: ['fmcsa', 'manual', null],
      default: null,
    },
    stripeAccountId: { type: String, default: null },
    stripeAccountStatus: {
      type: String,
      enum: ['pending', 'connected', null],
      default: null,
    },
    isOnboardingComplete: { type: Boolean, default: false },
    onboardingSteps: {
      type: onboardingStepsSchema,
      default: () => ({
        profile: false,
        business: false,
        stripe: false,
        preferences: false,
      }),
    },
    refreshTokenHash: { type: String, default: null },
    refreshTokenExpiresAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: 'active',
    },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ identityStatus: 1, verificationMethod: 1 });

export const UserModel = authDb.model<IUser>('User', userSchema);
