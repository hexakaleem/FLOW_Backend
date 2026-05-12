import { Schema, Document } from 'mongoose';
import { TRUCK_TYPES, TruckType } from '@flow/shared';
import { fleetDb } from '../../../lib/mongo';

export const TRUCK_STATUSES = [
  'available',
  'assigned',
  'en_route',
  'loading',
  'loaded',
  'in_transit',
  'unloading',
  'maintenance',
  'decommissioned',
  'removed',
] as const;

export type TruckStatus = (typeof TRUCK_STATUSES)[number];

export interface ITruck extends Document {
  orgId: string;
  plateNumber: string;
  plateState: string;
  internalId: string;
  vin: string | null;
  type: TruckType;
  year: number | null;
  make: string | null;
  vehicleModel: string | null;
  engineType: string | null;
  status: TruckStatus;
  assignedDriverId: string | null;
  assignedDriverName: string | null;
  driverAssignedAt: Date | null;
  gpsDeviceId: string | null;
  linkedTrailerId: string | null;
  activeLoadId: string | null;
  insurancePolicy: string | null;
  insuranceCarrier: string | null;
  insuranceExpiry: Date | null;
  registrationNumber: string | null;
  registrationExpiry: Date | null;
  inspectionExpiry: Date | null;
  photos: string[];
  specs: {
    maxWeight: number | null;
    length: number | null;
    hasLiftgate: boolean;
    isHazmatCertified: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const truckSpecsSchema = new Schema(
  {
    maxWeight: { type: Number, default: null },
    length: { type: Number, default: null },
    hasLiftgate: { type: Boolean, default: false },
    isHazmatCertified: { type: Boolean, default: false },
  },
  { _id: false },
);

const truckSchema = new Schema<ITruck>(
  {
    orgId: { type: String, required: true, index: true },
    plateNumber: { type: String, required: true },
    plateState: { type: String, required: true },
    internalId: { type: String, required: true },
    vin: { type: String, default: null, sparse: true },
    type: { type: String, required: true, enum: TRUCK_TYPES },
    year: { type: Number, default: null },
    make: { type: String, default: null },
    vehicleModel: { type: String, default: null },
    engineType: { type: String, default: null },
    status: { type: String, default: 'available', enum: TRUCK_STATUSES },
    assignedDriverId: { type: String, default: null, index: true },
    assignedDriverName: { type: String, default: null },
    driverAssignedAt: { type: Date, default: null },
    gpsDeviceId: { type: String, default: null, sparse: true },
    linkedTrailerId: { type: String, default: null },
    activeLoadId: { type: String, default: null },
    insurancePolicy: { type: String, default: null },
    insuranceCarrier: { type: String, default: null },
    insuranceExpiry: { type: Date, default: null },
    registrationNumber: { type: String, default: null },
    registrationExpiry: { type: Date, default: null },
    inspectionExpiry: { type: Date, default: null },
    photos: { type: [String], default: [] },
    specs: { type: truckSpecsSchema, default: () => ({}) },
  },
  { timestamps: true },
);

truckSchema.index({ orgId: 1, plateNumber: 1, plateState: 1 }, { unique: true });
truckSchema.index({ orgId: 1, status: 1 });

export const TruckModel = fleetDb.model<ITruck>('Truck', truckSchema);
