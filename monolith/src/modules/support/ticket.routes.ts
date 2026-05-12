import { Router } from 'express';
import { TicketController } from './ticket.controller';

export const ticketRoutes = Router();

ticketRoutes.post('/', TicketController.createTicket);
ticketRoutes.get('/', TicketController.getTickets);
ticketRoutes.get('/:id', TicketController.getTicket);
ticketRoutes.post('/:id/reply', TicketController.addReply);
ticketRoutes.patch('/:id/status', TicketController.updateStatus);
