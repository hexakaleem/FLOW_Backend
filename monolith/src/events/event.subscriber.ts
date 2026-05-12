import { redisSub } from '../lib/redis';
import { matchingQueue } from '../queues/matching.queue';
import { notificationQueue } from '../queues/notification.queue';
import type { DomainEvent } from './events.types';

const DOMAIN_CHANNEL = 'flow:domain-events';

export function startEventSubscriber(): void {
  redisSub.subscribe(DOMAIN_CHANNEL, (err) => {
    if (err) {
      console.error('[EVENT-SUB] Failed to subscribe:', err.message);
      return;
    }
    console.log('[EVENT-SUB] Listening for domain events');
  });

  redisSub.on('message', (channel, message) => {
    if (channel !== DOMAIN_CHANNEL) return;

    try {
      const event = JSON.parse(message) as DomainEvent;
      console.log(`[EVENT-SUB] received ${event.type}`);

      switch (event.type) {
        case 'load:posted': {
          notificationQueue.add('inapp', {
            type: 'inapp:load-posted',
            payload: {
              loadId: event.payload.loadId,
              orgId: event.payload.orgId,
              origin: event.payload.origin,
              truckType: event.payload.truckType,
              rate: event.payload.rate,
              rateType: event.payload.rateType,
              pickupDate: event.payload.pickupDate,
              weight: event.payload.weight,
              createdBy: event.payload.createdBy,
            },
          }).catch(() => {});
          matchingQueue.add('match-nearby', event).catch(() => {});
          break;
        }

        case 'booking:requested': {
          notificationQueue.add('push', {
            type: 'push:booking-requested',
            payload: {
              brokerUserId: event.payload.brokerUserId,
              loadId: event.payload.loadId,
            },
          }).catch(() => {});
          notificationQueue.add('inapp', {
            type: 'inapp:booking-requested',
            payload: {
              brokerUserId: (event.payload as { brokerUserId?: string }).brokerUserId,
              brokerOrgId: (event.payload as { brokerOrgId?: string }).brokerOrgId,
              carrierUserId: (event.payload as { carrierUserId?: string }).carrierUserId,
              loadId: event.payload.loadId,
              bookingRequestId: (event.payload as { bookingRequestId?: string }).bookingRequestId,
            },
          }).catch(() => {});
          break;
        }

        case 'booking:confirmed': {
          notificationQueue.add('push', {
            type: 'push:booking-confirmed',
            payload: {
              carrierUserId: event.payload.carrierUserId,
              brokerOrgId: (event.payload as { brokerOrgId?: string }).brokerOrgId,
              loadId: event.payload.loadId,
            },
          }).catch(() => {});
          notificationQueue.add('inapp', {
            type: 'inapp:booking-confirmed',
            payload: {
              carrierUserId: event.payload.carrierUserId,
              brokerOrgId: (event.payload as { brokerOrgId?: string }).brokerOrgId,
              loadId: event.payload.loadId,
              bookingRequestId: (event.payload as { bookingRequestId?: string }).bookingRequestId,
            },
          }).catch(() => {});
          break;
        }

        case 'booking:denied': {
          notificationQueue.add('inapp', {
            type: 'inapp:booking-denied',
            payload: {
              carrierUserId: event.payload.carrierUserId,
              brokerUserId: event.payload.brokerUserId,
              loadId: event.payload.loadId,
              bookingRequestId: event.payload.bookingRequestId,
            },
          }).catch(() => {});
          break;
        }

        case 'counteroffer:submitted': {
          notificationQueue.add('inapp', {
            type: 'inapp:counteroffer-submitted',
            payload: {
              counterOfferId: event.payload.counterOfferId,
              loadId: event.payload.loadId,
              offeredBy: event.payload.offeredBy,
              offeredTo: event.payload.offeredTo,
              proposedRate: event.payload.proposedRate,
            },
          }).catch(() => {});
          break;
        }

        case 'counteroffer:accepted': {
          notificationQueue.add('inapp', {
            type: 'inapp:counteroffer-accepted',
            payload: {
              counterOfferId: event.payload.counterOfferId,
              loadId: event.payload.loadId,
              acceptedBy: event.payload.acceptedBy,
              acceptedByRole: event.payload.acceptedByRole,
            },
          }).catch(() => {});
          break;
        }

        case 'load:updated': {
          notificationQueue.add('inapp', {
            type: 'inapp:load-updated',
            payload: {
              loadId: event.payload.loadId,
              orgId: event.payload.orgId,
              status: event.payload.status,
              changedBy: event.payload.changedBy,
            },
          }).catch(() => {});
          break;
        }

        case 'user:registered': {
          notificationQueue.add('inapp', {
            type: 'inapp:user-registered',
            payload: { userId: event.payload.userId, email: event.payload.email, role: event.payload.role },
          }).catch(() => {});
          break;
        }

        case 'team:invite-sent': {
          notificationQueue.add('inapp', {
            type: 'inapp:team-invite-sent',
            payload: {
              inviteId: event.payload.inviteId,
              inviteeEmail: event.payload.inviteeEmail,
              role: event.payload.role,
            },
          }).catch(() => {});
          break;
        }

        case 'truckrequest:created': {
          notificationQueue.add('inapp', {
            type: 'inapp:truckrequest-created',
            payload: {
              truckRequestId: event.payload.truckRequestId,
              loadId: event.payload.loadId,
              brokerOrgId: event.payload.brokerOrgId,
              carrierOrgId: event.payload.carrierOrgId,
            },
          }).catch(() => {});
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[EVENT-SUB] Failed to process event:', err);
    }
  });
}
