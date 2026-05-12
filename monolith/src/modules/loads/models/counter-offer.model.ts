import { Schema, Document, Types } from 'mongoose';
import { BOOKING_STATUSES, BookingStatus } from '@flow/shared';
import { loadsDb } from '../../../lib/mongo';

const COUNTER_DIRECTIONS = ['carrier_to_broker', 'broker_to_carrier'] as const;
export type CounterDirection = (typeof COUNTER_DIRECTIONS)[number];

export interface ICounterOffer extends Document {
  loadId: string;
  bookingRequestId: string | null;
  offeredBy: string;
  offeredTo: string;
  proposedRate: number;
  originalRate: number;
  note: string | null;
  status: BookingStatus;
  direction: CounterDirection;
  expiresAt: Date;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const counterOfferSchema = new Schema<ICounterOffer>(
  {
    loadId: { type: String, required: true, index: true },
    bookingRequestId: { type: String, default: null },
    offeredBy: { type: String, required: true },
    offeredTo: { type: String, required: true },
    proposedRate: { type: Number, required: true },
    originalRate: { type: Number, required: true },
    note: { type: String, default: null },
    status: { type: String, default: 'pending', enum: BOOKING_STATUSES },
    direction: { type: String, required: true, enum: COUNTER_DIRECTIONS },
    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const CounterOfferModel = loadsDb.model<ICounterOffer>(
  'CounterOffer',
  counterOfferSchema,
  'counter_offers',
);
