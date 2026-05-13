import { Schema, Document } from 'mongoose';
import { docsDb } from '../../../lib/mongo';

export const DOCUMENT_TYPES = [
  'rate_confirmation',
  'bol',
  'pod',
  'invoice',
  'insurance',
  'registration',
  'vehicle_photo',
  'other',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface IDocument extends Document {
  orgId: string;
  userId: string;
  loadId: string | null;
  type: DocumentType;
  fileUrl: string;
  publicId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: DocumentStatus;
  metadata: Record<string, unknown>;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    orgId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    loadId: { type: String, default: null, index: true },
    type: { type: String, required: true, enum: DOCUMENT_TYPES },
    fileUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    status: { type: String, default: 'pending', enum: DOCUMENT_STATUSES },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
    notes: { type: String, default: null },
  },
  { timestamps: true },
);

documentSchema.index({ orgId: 1, loadId: 1 });
documentSchema.index({ orgId: 1, type: 1 });
documentSchema.index({ loadId: 1, type: 1 });

export const DocumentModel = docsDb.model<IDocument>('Document', documentSchema);