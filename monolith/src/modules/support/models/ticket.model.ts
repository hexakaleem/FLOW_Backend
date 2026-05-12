import { Schema, Document, Types } from 'mongoose';
import { usersDb } from '../../../lib/mongo';

export interface ITicket extends Document {
  userId: string;
  orgId: string;
  loadId: string | null;
  subject: string;
  description: string;
  category: 'payment' | 'booking' | 'load' | 'technical' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITicketReply extends Document {
  ticketId: string;
  userId: string;
  content: string;
  isStaff: boolean;
  createdAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, required: true },
    loadId: { type: String, default: null },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ['payment', 'booking', 'load', 'technical', 'other'], required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    assignedTo: { type: String, default: null },
  },
  { timestamps: true },
);

ticketSchema.index({ userId: 1, createdAt: -1 });
ticketSchema.index({ status: 1 });

const replySchema = new Schema<ITicketReply>(
  {
    ticketId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    content: { type: String, required: true },
    isStaff: { type: Boolean, default: false },
  },
  { timestamps: true },
);

replySchema.index({ ticketId: 1, createdAt: 1 });

export const TicketModel = usersDb.model<ITicket>('Ticket', ticketSchema);
export const TicketReplyModel = usersDb.model<ITicketReply>('TicketReply', replySchema);
