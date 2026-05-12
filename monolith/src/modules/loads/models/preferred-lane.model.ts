import { Schema, Document, Types } from 'mongoose';
import { loadsDb } from '../../../lib/mongo';

export interface IPreferredLane extends Document {
  userId: string;
  originState: string;
  destinationState: string;
  minRatePerMile: number | null;
  minRatePerTrip: number | null;
  maxDistance: number | null;
  truckTypes: string[];
  alertEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const preferredLaneSchema = new Schema<IPreferredLane>(
  {
    userId: { type: String, required: true, index: true },
    originState: { type: String, required: true },
    destinationState: { type: String, required: true },
    minRatePerMile: { type: Number, default: null },
    minRatePerTrip: { type: Number, default: null },
    maxDistance: { type: Number, default: null },
    truckTypes: { type: [String], default: [] },
    alertEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const PreferredLaneModel = loadsDb.model<IPreferredLane>(
  'PreferredLane',
  preferredLaneSchema,
  'preferred_lanes',
);
