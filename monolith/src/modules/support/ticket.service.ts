import { Types } from 'mongoose';
import { TicketModel, TicketReplyModel, ITicket, ITicketReply } from './models/ticket.model';
import { AppError } from '../../lib/errors';

export class TicketService {
  static async createTicket(
    userId: string,
    orgId: string,
    loadId: string | null,
    subject: string,
    description: string,
    category: string,
    priority: string,
  ): Promise<ITicket> {
    return TicketModel.create({
      userId,
      orgId,
      loadId,
      subject,
      description,
      category,
      priority,
    });
  }

  static async getTickets(userId: string, status?: string, page = 1, limit = 20): Promise<{ tickets: ITicket[]; total: number }> {
    const query: Record<string, unknown> = { userId };
    if (status) query.status = status;

    const [tickets, total] = await Promise.all([
      TicketModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TicketModel.countDocuments(query),
    ]);

    return { tickets: tickets as unknown as ITicket[], total };
  }

  static async getTicket(ticketId: string, userId: string): Promise<ITicket> {
    const ticket = await TicketModel.findOne({ _id: ticketId, userId });
    if (!ticket) throw AppError.notFound('Ticket', ticketId);
    return ticket;
  }

  static async addReply(
    ticketId: string,
    userId: string,
    content: string,
    isStaff = false,
  ): Promise<ITicketReply> {
    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) throw AppError.notFound('Ticket', ticketId);

    if (ticket.status === 'closed') {
      throw AppError.badRequest('TICKET_CLOSED', 'Cannot reply to a closed ticket');
    }

    const reply = await TicketReplyModel.create({ ticketId, userId, content, isStaff });

    if (ticket.status === 'resolved') {
      ticket.status = 'in_progress';
      await ticket.save();
    }

    return reply;
  }

  static async getReplies(ticketId: string): Promise<ITicketReply[]> {
    return TicketReplyModel.find({ ticketId }).sort({ createdAt: 1 }).lean() as unknown as Promise<ITicketReply[]>;
  }

  static async updateStatus(ticketId: string, userId: string, status: string): Promise<ITicket> {
    const ticket = await TicketModel.findOneAndUpdate(
      { _id: ticketId, userId },
      { status },
      { new: true },
    );
    if (!ticket) throw AppError.notFound('Ticket', ticketId);
    return ticket;
  }
}
