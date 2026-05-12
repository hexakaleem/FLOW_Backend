import { Queue, Worker } from 'bullmq';
import { redis, redisPub } from '../lib/redis';
import { NotificationService } from '../modules/notifications/notification.service';

const NOTIFICATION_QUEUE_NAME = 'flow:notifications';

export const notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

interface NotificationJob {
  type: string;
  payload: Record<string, unknown>;
}

async function persistAndEmit(
  type: string,
  payload: NotificationJob['payload'],
  inAppType: string,
  title: string,
  messageTemplate: (id: string) => string,
): Promise<void> {
  let targetUserId = '';
  let loadId = '';

  const getUserAndLoad = () => {
    if ('brokerUserId' in payload && typeof payload.brokerUserId === 'string') { targetUserId = payload.brokerUserId; }
    else if ('carrierUserId' in payload && typeof payload.carrierUserId === 'string') { targetUserId = payload.carrierUserId; }
    else if ('offeredTo' in payload && typeof payload.offeredTo === 'string') { targetUserId = payload.offeredTo; }
    else if ('acceptedBy' in payload && typeof payload.acceptedBy === 'string') { targetUserId = payload.acceptedBy; }
    if ('loadId' in payload && typeof payload.loadId === 'string') { loadId = payload.loadId; }
  };

  getUserAndLoad();

  const logId = loadId ? loadId.slice(-6).toUpperCase() : 'unknown';

  if (targetUserId) {
    await NotificationService.createNotification(
      targetUserId,
      inAppType,
      title,
      messageTemplate(logId),
      payload,
    ).catch((err) => console.error(`[NOTIFY] failed to persist notification: ${err.message}`));
  }

  const emits = buildSocketEmits(type, payload);
  if (emits.length > 0) {
    await publishDeliveryEvents(emits);
  }
}

function buildSocketEmits(type: string, payload: NotificationJob['payload']): Array<{ rooms: string[]; event: string; data: unknown }> {
  const emits: Array<{ rooms: string[]; event: string; data: unknown }> = [];

  switch (type) {
    case 'push:booking-requested': {
      const { brokerUserId, loadId } = payload as { brokerUserId?: string; loadId?: string };
      if (brokerUserId) emits.push({ rooms: [`user:${brokerUserId}`], event: 'notification', data: { type: 'booking:requested', loadId } });
      break;
    }
    case 'push:booking-confirmed': {
      const { carrierUserId, loadId } = payload as { carrierUserId?: string; loadId?: string };
      if (carrierUserId) emits.push({ rooms: [`user:${carrierUserId}`], event: 'notification', data: { type: 'booking:confirmed', loadId } });
      break;
    }
    case 'inapp:load-updated': {
      const { userId, orgId, loadId, status, changedBy } = payload as {
        userId?: string; orgId?: string; loadId?: string; status?: string; changedBy?: string;
      };
      if (loadId) {
        emits.push({ rooms: [`load:${loadId}`], event: 'load:status', data: payload });
        if (orgId) emits.push({ rooms: [`org:${orgId}`], event: 'load:status', data: payload });
        if (changedBy) emits.push({ rooms: [`user:${changedBy}`], event: 'load:status', data: payload });
      }
      break;
    }
    case 'inapp:booking-requested': {
      const { brokerUserId, brokerOrgId, loadId } = payload as {
        brokerUserId?: string; brokerOrgId?: string; loadId?: string;
      };
      if (brokerUserId) emits.push({ rooms: [`user:${brokerUserId}`], event: 'notification', data: payload });
      if (brokerOrgId) emits.push({ rooms: [`org:${brokerOrgId}`], event: 'booking:requested', data: payload });
      break;
    }
    case 'inapp:booking-confirmed': {
      const { carrierUserId, brokerOrgId, loadId } = payload as {
        carrierUserId?: string; brokerOrgId?: string; loadId?: string;
      };
      if (carrierUserId) emits.push({ rooms: [`user:${carrierUserId}`], event: 'notification', data: payload });
      if (brokerOrgId) emits.push({ rooms: [`org:${brokerOrgId}`], event: 'booking:confirmed', data: payload });
      break;
    }
    case 'inapp:booking-denied': {
      const { carrierUserId, loadId } = payload as { carrierUserId?: string; loadId?: string };
      if (carrierUserId) emits.push({ rooms: [`user:${carrierUserId}`], event: 'notification', data: payload });
      break;
    }
    case 'inapp:counteroffer-submitted': {
      const { offeredTo, orgId, loadId } = payload as { offeredTo?: string; orgId?: string; loadId?: string };
      if (offeredTo) emits.push({ rooms: [`user:${offeredTo}`], event: 'notification', data: payload });
      if (orgId) emits.push({ rooms: [`org:${orgId}`], event: 'counteroffer:submitted', data: payload });
      break;
    }
    case 'inapp:counteroffer-accepted': {
      const { acceptedBy, loadId } = payload as { acceptedBy?: string; loadId?: string };
      if (acceptedBy) emits.push({ rooms: [`user:${acceptedBy}`], event: 'notification', data: payload });
      break;
    }
    case 'inapp:load-posted': {
      const { orgId, loadId } = payload as { orgId?: string; loadId?: string };
      if (orgId) emits.push({ rooms: [`org:${orgId}`], event: 'load:new', data: payload });
      break;
    }
    case 'inapp:team-invite-sent': {
      const { inviteeEmail } = payload as { inviteeEmail?: string };
      if (inviteeEmail) emits.push({ rooms: [`user:${inviteeEmail}`], event: 'team:invite', data: payload });
      break;
    }
  }

  return emits;
}

async function publishDeliveryEvents(emits: Array<{ rooms: string[]; event: string; data: unknown }>): Promise<void> {
  for (const emit of emits) {
    await redisPub.publish(
      'flow:delivery-events',
      JSON.stringify({ type: 'socket:emit', rooms: emit.rooms, event: emit.event, payload: emit.data }),
    );
  }
}

export const notificationWorker = new Worker(
  NOTIFICATION_QUEUE_NAME,
  async (job) => {
    const { type, payload } = job.data as NotificationJob;

    switch (type) {
      case 'email:booking-notification': {
        const { to, subject } = payload as { to?: string; subject?: string };
        console.log(`[NOTIFY:EMAIL] booking notification to ${to}: ${subject}`);
        break;
      }
      case 'push:booking-requested': {
        await persistAndEmit(type, payload, 'booking:requested', 'New Booking Request',
          (id) => `A carrier has requested to book load ${id}`);
        break;
      }
      case 'push:booking-confirmed': {
        await persistAndEmit(type, payload, 'booking:confirmed', 'Booking Confirmed',
          (id) => `Your booking for load ${id} has been confirmed`);
        break;
      }
      case 'inapp:load-updated': {
        await persistAndEmit(type, payload, 'load:updated', 'Load Updated',
          (id) => `Load ${id} status changed to ${(payload as { status?: string }).status || 'unknown'}`);
        break;
      }
      case 'inapp:booking-requested': {
        await persistAndEmit(type, payload, 'booking:requested', 'New Booking Request',
          (id) => `A carrier has requested to book load ${id}`);
        break;
      }
      case 'inapp:booking-confirmed': {
        await persistAndEmit(type, payload, 'booking:confirmed', 'Booking Confirmed',
          (id) => `Your booking for load ${id} has been confirmed`);
        break;
      }
      case 'inapp:booking-denied': {
        await persistAndEmit(type, payload, 'booking:denied', 'Booking Denied',
          (id) => `Your booking request for load ${id} was not accepted`);
        break;
      }
      case 'inapp:counteroffer-submitted': {
        await persistAndEmit(type, payload, 'counteroffer:submitted', 'New Counter-Offer',
          (id) => `You received a counter-offer on load ${id}`);
        break;
      }
      case 'inapp:counteroffer-accepted': {
        await persistAndEmit(type, payload, 'counteroffer:accepted', 'Counter-Offer Accepted',
          (id) => `Load ${id} booked via counter-offer`);
        break;
      }
      case 'inapp:load-posted': {
        const { orgId, loadId } = payload as { orgId?: string; loadId?: string };
        if (orgId && loadId) {
          await NotificationService.createNotification(
            orgId, 'load:posted', 'New Load Posted',
            `Load ${loadId.slice(-6).toUpperCase()} has been posted to marketplace`,
            payload,
          ).catch((err) => console.error(`[NOTIFY] persist error: ${err.message}`));
        }
        const emits = buildSocketEmits(type, payload);
        if (emits.length > 0) await publishDeliveryEvents(emits);
        break;
      }
      case 'inapp:team-invite-sent': {
        const { inviteeEmail } = payload as { inviteeEmail?: string };
        if (inviteeEmail) {
          await NotificationService.createNotification(
            inviteeEmail, 'team:invite-sent', 'Team Invitation',
            `You have been invited to join a team as ${(payload as { role?: string }).role}`,
            payload,
          ).catch((err) => console.error(`[NOTIFY] persist error: ${err.message}`));
        }
        const emits = buildSocketEmits(type, payload);
        if (emits.length > 0) await publishDeliveryEvents(emits);
        break;
      }
      case 'inapp:lane-match': {
        const { userId, loadId, origin, destination, rate, truckType, weight } = payload as {
          userId?: string; loadId?: string;
          origin?: { city: string; state: string }; destination?: { city: string; state: string };
          rate?: number; truckType?: string; weight?: number;
        };
        if (userId) {
          await NotificationService.createNotification(
            userId, 'lane:match', 'Preferred Lane Match',
            `New load on your preferred lane: ${origin?.city}, ${origin?.state} → ${destination?.city}, ${destination?.state}`,
            payload,
          ).catch((err) => console.error(`[NOTIFY] persist error: ${err.message}`));
          const emits = [{ rooms: [`user:${userId}`], event: 'load:nearby', data: payload }];
          await publishDeliveryEvents(emits);
        }
        break;
      }
      case 'inapp:search-match': {
        const { userId, loadId, origin, destination, rate, truckType, weight } = payload as {
          userId?: string; loadId?: string;
          origin?: { city: string; state: string }; destination?: { city: string; state: string };
          rate?: number; truckType?: string; weight?: number;
        };
        if (userId) {
          await NotificationService.createNotification(
            userId, 'search:match', 'Saved Search Match',
            `Load matching your saved search: ${origin?.city}, ${origin?.state} → ${destination?.city}, ${destination?.state}`,
            payload,
          ).catch((err) => console.error(`[NOTIFY] persist error: ${err.message}`));
          const emits = [{ rooms: [`user:${userId}`], event: 'load:nearby', data: payload }];
          await publishDeliveryEvents(emits);
        }
        break;
      }
      default:
        console.log(`[NOTIFY] unhandled type: ${type}`);
    }
  },
  { connection: redis },
);

notificationWorker.on('completed', (job) => {
  console.log(`[NOTIFY] job ${job.id} completed (${job.name})`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[NOTIFY] job ${job?.id} failed:`, err.message);
});
