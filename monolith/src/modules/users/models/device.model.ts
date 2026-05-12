import { Schema, Document } from 'mongoose';
import { usersDb } from '../../../lib/mongo';

export interface IDevice extends Document {
  userId: string;
  platform: 'ios' | 'android';
  fcmToken: string;
  deviceId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    userId: { type: String, required: true, index: true },
    platform: { type: String, enum: ['ios', 'android'], required: true },
    fcmToken: { type: String, required: true },
    deviceId: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

deviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const DeviceModel = usersDb.model<IDevice>('Device', deviceSchema);
