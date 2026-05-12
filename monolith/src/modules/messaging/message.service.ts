import { Types } from 'mongoose';
import { MessageModel, IMessage } from './models/message.model';
import { AppError } from '../../lib/errors';

export class MessageService {
  static async sendMessage(
    loadId: string | null,
    senderId: string,
    senderOrgId: string,
    recipientId: string,
    recipientOrgId: string,
    content: string,
    attachments: string[] = [],
  ): Promise<IMessage> {
    const conversationId = [senderId, recipientId].sort().join('-');

    const message = await MessageModel.create({
      conversationId,
      loadId,
      senderId,
      senderOrgId,
      recipientId,
      recipientOrgId,
      content,
      attachments,
    });

    return message;
  }

  static async getConversations(userId: string): Promise<Array<{ conversationId: string; lastMessage: IMessage; unreadCount: number; otherUserId: string }>> {
    const messages = await MessageModel.aggregate([
      { $match: { $or: [{ senderId: userId }, { recipientId: userId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: { $cond: [{ $and: [{ $eq: ['$recipientId', userId] }, { $eq: ['$read', false] }] }, 1, 0] },
          },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
    ]);

    return messages.map((m) => ({
      conversationId: m._id,
      lastMessage: m.lastMessage,
      unreadCount: m.unreadCount,
      otherUserId: m.lastMessage.senderId === userId ? m.lastMessage.recipientId : m.lastMessage.senderId,
    }));
  }

  static async getMessages(conversationId: string, limit = 50): Promise<IMessage[]> {
    return MessageModel.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .then((msgs) => msgs.reverse());
  }

  static async markAsRead(conversationId: string, userId: string): Promise<void> {
    await MessageModel.updateMany(
      { conversationId, recipientId: userId, read: false },
      { read: true, readAt: new Date() },
    );
  }

  static async getUnreadCount(userId: string): Promise<number> {
    return MessageModel.countDocuments({ recipientId: userId, read: false });
  }
}
