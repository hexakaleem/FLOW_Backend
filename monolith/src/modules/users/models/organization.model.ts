import { Schema, Document } from 'mongoose';
import { usersDb } from '../../../lib/mongo';

export interface IOrganization extends Document {
  name: string;
  mcNumber: string | null;
  dotNumber: string | null;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
  scacCode: string | null;
  factoringCompany: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    mcNumber: { type: String, default: null },
    dotNumber: { type: String, default: null },
    address: {
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
    },
    scacCode: { type: String, default: null },
    factoringCompany: { type: String, default: null },
    ownerId: { type: String, required: true },
  },
  { timestamps: true },
);

export const OrganizationModel = usersDb.model<IOrganization>(
  'Organization',
  organizationSchema,
);
