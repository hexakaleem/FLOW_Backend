import { Router } from 'express';
import { NotificationController } from './notification.controller';

export const notificationRoutes = Router();

notificationRoutes.get('/', NotificationController.getNotifications);
notificationRoutes.put('/mark-all-read', NotificationController.markAsRead);
notificationRoutes.delete('/:id', NotificationController.deleteNotification);
notificationRoutes.get('/unread-count', NotificationController.getUnreadCount);
