import { Schema, Document, Types } from 'mongoose';
import { BOOKING_STATUSES, BookingStatus } from '@flow/shared';
import { loadsDb } from '../../../lib/mongo';

export interface ITruckRequest extends Document {
  loadId: string;
  requestedBy: string;
  truckId: string;
  carrierOrgId: string;
  offeredRate: number;
  status: BookingStatus;
  respondedBy: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const truckRequestSchema = new Schema<ITruckRequest>(
  {
    loadId: { type: String, required: true, index: true },
    requestedBy: { type: String, required: true },
    truckId: { type: String, required: true },
    carrierOrgId: { type: String, required: true },
    offeredRate: { type: Number, required: true },
    status: { type: String, default: 'pending', enum: BOOKING_STATUSES },
    respondedBy: { type: String, default: null },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const TruckRequestModel = loadsDb.model<ITruckRequest>(
  'TruckRequest',
  truckRequestSchema,
  'truck_requests',
);
