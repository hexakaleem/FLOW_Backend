import { Schema, Document, Types } from 'mongoose';
import {
  TRUCK_TYPES,
  RATE_TYPES,
  LOAD_STATUSES,
  TruckType,
  RateType,
  LoadStatus,
} from '@flow/shared';
import { loadsDb } from '../../../lib/mongo';

export interface ILoad extends Document {
  orgId: string;
  createdBy: string;
  shipperName: string;
  shipperPhone: string;
  shipperEmail: string;
  referenceNumber: string | null;
  origin: {
    address: string;
    city: string;
    state: string;
    zip: string;
    lat: number;
    lng: number;
    coordinates?: [number, number];
    contactName: string;
    contactPhone: string;
  };
  destination: {
    address: string;
    city: string;
    state: string;
    zip: string;
    lat: number;
    lng: number;
    coordinates?: [number, number];
    contactName: string;
    contactPhone: string;
  };
  pickupDate: Date;
  deliveryDate: Date;
  pickupWindow: { start: string; end: string } | null;
  deliveryWindow: { start: string; end: string } | null;
  weight: number;
  truckType: TruckType;
  commodity: string | null;
  hazardousClass: string | null;
  temperatureMin: number | null;
  temperatureMax: number | null;
  rate: number;
  rateType: RateType;
  rateNegotiable: boolean;
  specialRequirements: string | null;
  isPublic: boolean;
  requireVerifiedCarrier: boolean;
  requiresHazmat: boolean;
  requiresLiftgate: boolean;
  maxVehicleLength: number | null;
  internalNotes: string | null;
  status: LoadStatus;
  statusHistory: Array<{
    status: string;
    changedBy: string;
    changedAt: Date;
    note: string | null;
  }>;
  assignedTruckId: string | null;
  assignedDriverId: string | null;
  assignedAt: Date | null;
  bookingRequestCount: number;
  confirmedBookingId: string | null;
  estimatedDistance: number | null;
  isArchived: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const loadAddressSchema = new Schema(
  {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    coordinates: { type: [Number], index: '2dsphere' },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
  },
  { _id: false },
);

const statusHistoryEntrySchema = new Schema(
  {
    status: { type: String, required: true },
    changedBy: { type: String, required: true },
    changedAt: { type: Date, required: true },
    note: { type: String, default: null },
  },
  { _id: false },
);

const loadWindowSchema = new Schema(
  {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false },
);

const loadSchema = new Schema<ILoad>(
  {
    orgId: { type: String, required: true, index: true },
    createdBy: { type: String, required: true },
    shipperName: { type: String, required: true },
    shipperPhone: { type: String, required: true },
    shipperEmail: { type: String, required: true },
    referenceNumber: { type: String, default: null },
    origin: { type: loadAddressSchema, required: true },
    destination: { type: loadAddressSchema, required: true },
    pickupDate: { type: Date, required: true },
    deliveryDate: { type: Date, required: true },
    pickupWindow: { type: loadWindowSchema, default: null },
    deliveryWindow: { type: loadWindowSchema, default: null },
    weight: { type: Number, required: true },
    truckType: { type: String, required: true, enum: TRUCK_TYPES },
    commodity: { type: String, default: null },
    hazardousClass: { type: String, default: null },
    temperatureMin: { type: Number, default: null },
    temperatureMax: { type: Number, default: null },
    rate: { type: Number, required: true },
    rateType: { type: String, required: true, enum: RATE_TYPES },
    rateNegotiable: { type: Boolean, default: false },
    specialRequirements: { type: String, default: null },
    isPublic: { type: Boolean, default: true },
    requireVerifiedCarrier: { type: Boolean, default: false },
    requiresHazmat: { type: Boolean, default: false },
    requiresLiftgate: { type: Boolean, default: false },
    maxVehicleLength: { type: Number, default: null },
    internalNotes: { type: String, default: null },
    status: { type: String, default: 'draft', enum: LOAD_STATUSES },
    statusHistory: {
      type: [statusHistoryEntrySchema],
      default: [],
    },
    assignedTruckId: { type: String, default: null },
    assignedDriverId: { type: String, default: null },
    assignedAt: { type: Date, default: null },
    bookingRequestCount: { type: Number, default: 0 },
    confirmedBookingId: { type: String, default: null },
    estimatedDistance: { type: Number, default: null },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

loadSchema.index({ orgId: 1, status: 1 });
loadSchema.index({ status: 1, isPublic: 1, pickupDate: 1 });
loadSchema.index({ assignedDriverId: 1, status: 1 });
loadSchema.index({ assignedTruckId: 1, status: 1 });
loadSchema.index({ 'origin.lat': 1, 'origin.lng': 1 });
loadSchema.index({ 'destination.lat': 1, 'destination.lng': 1 });
loadSchema.index({ createdAt: -1 });
loadSchema.index({ pickupDate: 1 });

export const LoadModel = loadsDb.model<ILoad>('Load', loadSchema);
