import { Schema, Document } from 'mongoose';
import { MEMBERSHIP_STATUSES, MembershipStatus } from '@flow/shared';
import { usersDb } from '../../../lib/mongo';

export interface IMembership extends Document {
  userId: string;
  orgId: string;
  roleId: string;
  status: MembershipStatus;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<IMembership>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, required: true, index: true },
    roleId: { type: String, required: true },
    status: {
      type: String,
      enum: MEMBERSHIP_STATUSES,
      default: 'active',
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

membershipSchema.index({ userId: 1, orgId: 1 }, { unique: true });
membershipSchema.index({ orgId: 1, status: 1 });

export const MembershipModel = usersDb.model<IMembership>(
  'Membership',
  membershipSchema,
);
