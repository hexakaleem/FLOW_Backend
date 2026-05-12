import { Schema, Document } from 'mongoose';
import { usersDb } from '../../../lib/mongo';

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface IInvite extends Document {
  orgId: string;
  invitedBy: string;
  email: string;
  roleId: string;
  token: string;
  status: InviteStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inviteSchema = new Schema<IInvite>(
  {
    orgId: { type: String, required: true, index: true },
    invitedBy: { type: String, required: true },
    email: { type: String, required: true },
    roleId: { type: String, required: true },
    token: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'cancelled'],
      default: 'pending',
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export const InviteModel = usersDb.model<IInvite>('Invite', inviteSchema);
