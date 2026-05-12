import { Router } from 'express';
import { MessageController } from './message.controller';

export const messageRoutes = Router();

messageRoutes.get('/conversations', MessageController.getConversations);
messageRoutes.get('/conversations/:conversationId/messages', MessageController.getMessages);
messageRoutes.post('/send', MessageController.sendMessage);
messageRoutes.put('/conversations/:conversationId/read', MessageController.markAsRead);
messageRoutes.get('/unread-count', MessageController.getUnreadCount);
