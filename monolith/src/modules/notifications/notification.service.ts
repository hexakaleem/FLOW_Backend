import { NotificationModel, INotification } from './models/notification.model';
import { AppError } from '../../lib/errors';

export class NotificationService {
  static async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    data: Record<string, unknown> = {},
  ): Promise<INotification> {
    return NotificationModel.create({ userId, type, title, message, data });
  }

  static async getNotifications(userId: string, page = 1, limit = 50): Promise<{ notifications: INotification[]; total: number; unreadCount: number }> {
    const [notifications, total, unreadCount] = await Promise.all([
      NotificationModel.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments({ userId }),
      NotificationModel.countDocuments({ userId, read: false }),
    ]);

    return { notifications: notifications as unknown as INotification[], total, unreadCount };
  }

  static async markAsRead(userId: string, notificationIds?: string[]): Promise<void> {
    if (notificationIds && notificationIds.length > 0) {
      await NotificationModel.updateMany(
        { _id: { $in: notificationIds }, userId },
        { read: true, readAt: new Date() },
      );
    } else {
      await NotificationModel.updateMany(
        { userId, read: false },
        { read: true, readAt: new Date() },
      );
    }
  }

  static async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const result = await NotificationModel.deleteOne({ _id: notificationId, userId });
    if (result.deletedCount === 0) {
      throw AppError.notFound('Notification', notificationId);
    }
  }
}
