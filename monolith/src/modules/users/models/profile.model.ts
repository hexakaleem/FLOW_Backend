import { Schema, Document } from 'mongoose';
import { usersDb } from '../../../lib/mongo';

export interface IProfile extends Document {
  userId: string;
  orgId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  phone: string | null;
  timezone: string;
  notificationPreferences: {
    email: { enabled: boolean; events: string[] };
    push: { enabled: boolean; events: string[] };
    inapp: { enabled: boolean; events: string[] };
  };
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    orgId: { type: String, required: true, index: true },
    email: { type: String, required: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    avatar: { type: String, default: null },
    phone: { type: String, default: null },
    timezone: { type: String, default: 'America/Chicago' },
    notificationPreferences: {
      type: {
        email: {
          enabled: { type: Boolean, default: true },
          events: [{ type: String }],
        },
        push: {
          enabled: { type: Boolean, default: true },
          events: [{ type: String }],
        },
        inapp: {
          enabled: { type: Boolean, default: true },
          events: [{ type: String }],
        },
      },
      default: () => ({
        email: { enabled: true, events: [] },
        push: { enabled: true, events: [] },
        inapp: { enabled: true, events: [] },
      }),
    },
  },
  { timestamps: true },
);

export const ProfileModel = usersDb.model<IProfile>('Profile', profileSchema);
