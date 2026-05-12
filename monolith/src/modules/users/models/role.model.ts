import { Schema, Document } from 'mongoose';
import { usersDb } from '../../../lib/mongo';

export interface IRole extends Document {
  orgId: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

roleSchema.index({ orgId: 1, name: 1 }, { unique: true });

export const RoleModel = usersDb.model<IRole>('Role', roleSchema);
