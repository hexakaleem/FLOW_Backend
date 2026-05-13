import { Application } from 'express';
import { authRoutes } from './auth.routes';
import { userRoutes } from './users.routes';
import { teamRoutes } from './teams.routes';
import { fleetRoutes } from './fleet.routes';
import { loadRoutes } from './loads.routes';
import { marketplaceRoutes } from './marketplace.routes';
import { analyticsRoutes } from './analytics.routes';
import { deviceRoutes } from './devices.routes';
import { messageRoutes } from './messages.routes';
import { reviewRoutes } from './reviews.routes';
import { notificationRoutes } from './notifications.routes';
import { ticketRoutes } from './tickets.routes';
import { documentRoutes } from './documents.routes';
import { adminRoutes } from './admin.routes';

export function mountRoutes(app: Application): void {
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/fleet', fleetRoutes);
  app.use('/api/loads', loadRoutes);
  app.use('/api/marketplace', marketplaceRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/devices', deviceRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/admin', adminRoutes);
}
