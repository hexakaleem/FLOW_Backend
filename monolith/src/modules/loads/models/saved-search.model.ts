import { Schema, Document, Types } from 'mongoose';
import { loadsDb } from '../../../lib/mongo';

export interface ISavedSearch extends Document {
  userId: string;
  name: string;
  filters: {
    origin?: { city?: string; state?: string };
    destination?: { city?: string; state?: string };
    truckType?: string;
    minRate?: number;
    maxDistance?: number;
    pickupDateStart?: Date;
    pickupDateEnd?: Date;
    minWeight?: number;
    maxWeight?: number;
  };
  alertEnabled: boolean;
  alertChannels: string[];
  createdAt: Date;
  updatedAt: Date;
}

const searchFilterSchema = new Schema(
  {
    origin: {
      type: new Schema({ city: String, state: String }, { _id: false }),
      default: null,
    },
    destination: {
      type: new Schema({ city: String, state: String }, { _id: false }),
      default: null,
    },
    truckType: { type: String },
    minRate: { type: Number },
    maxDistance: { type: Number },
    pickupDateStart: { type: Date },
    pickupDateEnd: { type: Date },
    minWeight: { type: Number },
    maxWeight: { type: Number },
  },
  { _id: false },
);

const savedSearchSchema = new Schema<ISavedSearch>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    filters: { type: searchFilterSchema, default: () => ({}) },
    alertEnabled: { type: Boolean, default: false },
    alertChannels: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const SavedSearchModel = loadsDb.model<ISavedSearch>(
  'SavedSearch',
  savedSearchSchema,
  'saved_searches',
);
