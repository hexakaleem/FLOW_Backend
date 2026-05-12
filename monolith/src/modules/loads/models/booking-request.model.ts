import { Schema, Document, Types } from 'mongoose';
import { BOOKING_STATUSES, BookingStatus } from '@flow/shared';
import { loadsDb } from '../../../lib/mongo';

export interface IBookingRequest extends Document {
  loadId: string;
  carrierOrgId: string;
  carrierUserId: string;
  truckId: string;
  driverId: string;
  proposedRate: number | null;
  status: BookingStatus;
  respondedBy: string | null;
  respondedAt: Date | null;
  denialReason: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bookingRequestSchema = new Schema<IBookingRequest>(
  {
    loadId: { type: String, required: true, index: true },
    carrierOrgId: { type: String, required: true },
    carrierUserId: { type: String, required: true, index: true },
    truckId: { type: String, required: true },
    driverId: { type: String, required: true },
    proposedRate: { type: Number, default: null },
    status: { type: String, default: 'pending', enum: BOOKING_STATUSES },
    respondedBy: { type: String, default: null },
    respondedAt: { type: Date, default: null },
    denialReason: { type: String, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

bookingRequestSchema.index({ loadId: 1, carrierOrgId: 1 }, { unique: true });
bookingRequestSchema.index({ loadId: 1, status: 1 });

export const BookingRequestModel = loadsDb.model<IBookingRequest>(
  'BookingRequest',
  bookingRequestSchema,
  'booking_requests',
);
