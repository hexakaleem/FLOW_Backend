import { Schema, Document, Types } from 'mongoose';
import { usersDb } from '../../../lib/mongo';

export interface IMessage extends Document {
  conversationId: string;
  loadId: string | null;
  senderId: string;
  senderOrgId: string;
  recipientId: string;
  recipientOrgId: string;
  content: string;
  attachments: string[];
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: String, required: true, index: true },
    loadId: { type: String, default: null, index: true },
    senderId: { type: String, required: true, index: true },
    senderOrgId: { type: String, required: true },
    recipientId: { type: String, required: true, index: true },
    recipientOrgId: { type: String, required: true },
    content: { type: String, required: true },
    attachments: { type: [String], default: [] },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, recipientId: 1 });

export const MessageModel = usersDb.model<IMessage>('Message', messageSchema);
