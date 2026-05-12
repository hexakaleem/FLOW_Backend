import { Schema, Document, Types } from 'mongoose';
import { fleetDb } from '../../../lib/mongo';

export interface ICompliance extends Document {
  orgId: string;
  driverId: string;
  driverName: string;
  cdlNumber: string;
  cdlState: string;
  cdlExpiryDate: Date;
  medicalCardExpiryDate: Date;
  lastCheckedAt: Date;
  alertsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const complianceSchema = new Schema<ICompliance>(
  {
    orgId: { type: String, required: true, index: true },
    driverId: { type: String, required: true, unique: true, index: true },
    driverName: { type: String, required: true },
    cdlNumber: { type: String, required: true },
    cdlState: { type: String, required: true },
    cdlExpiryDate: { type: Date, required: true, index: true },
    medicalCardExpiryDate: { type: Date, required: true, index: true },
    lastCheckedAt: { type: Date, default: Date.now },
    alertsEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

complianceSchema.index({ orgId: 1, cdlExpiryDate: 1 });
complianceSchema.index({ orgId: 1, medicalCardExpiryDate: 1 });

export const ComplianceModel = fleetDb.model<ICompliance>(
  'Compliance',
  complianceSchema,
);
