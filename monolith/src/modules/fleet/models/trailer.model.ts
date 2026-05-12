import { Schema, Document, Types } from 'mongoose';
import { TRUCK_TYPES, TruckType } from '@flow/shared';
import { fleetDb } from '../../../lib/mongo';

export const TRAILER_STATUSES = [
  'available',
  'assigned',
  'in_transit',
  'maintenance',
  'decommissioned',
] as const;

export type TrailerStatus = (typeof TRAILER_STATUSES)[number];

export interface ITrailer extends Document {
  orgId: string;
  type: TruckType;
  length: number;
  capacity: number;
  plateNumber: string;
  assignedTruckId: string | null;
  status: TrailerStatus;
  createdAt: Date;
  updatedAt: Date;
}

const trailerSchema = new Schema<ITrailer>(
  {
    orgId: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: TRUCK_TYPES },
    length: { type: Number, required: true },
    capacity: { type: Number, required: true },
    plateNumber: { type: String, required: true },
    assignedTruckId: { type: String, default: null, index: true },
    status: { type: String, default: 'available', enum: TRAILER_STATUSES },
  },
  { timestamps: true },
);

trailerSchema.index({ orgId: 1, status: 1 });

export const TrailerModel = fleetDb.model<ITrailer>('Trailer', trailerSchema);
