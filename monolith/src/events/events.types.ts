export type DomainEvent =
  | LoadPostedEvent
  | LoadUpdatedEvent
  | BookingRequestedEvent
  | BookingConfirmedEvent
  | BookingDeniedEvent
  | CounterOfferSubmittedEvent
  | CounterOfferAcceptedEvent
  | TruckRequestCreatedEvent
  | UserRegisteredEvent
  | TeamInviteSentEvent;

export interface BaseDomainEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface LoadPostedEvent extends BaseDomainEvent {
  type: 'load:posted';
  payload: {
    loadId: string;
    orgId: string;
    createdBy: string;
    origin: {
      address: string;
      city: string;
      state: string;
      lat: number;
      lng: number;
    };
    destination: {
      city: string;
      state: string;
    };
    truckType: string;
    rate: number;
    rateType: string;
    weight: number;
    pickupDate: string;
    requireVerifiedCarrier: boolean;
    requiresHazmat: boolean;
    requiresLiftgate: boolean;
    maxVehicleLength: number | null;
    temperatureMin: number | null;
    temperatureMax: number | null;
  };
}

export interface LoadUpdatedEvent extends BaseDomainEvent {
  type: 'load:updated';
  payload: {
    loadId: string;
    orgId: string;
    status: string;
    changedBy: string;
  };
}

export interface BookingRequestedEvent extends BaseDomainEvent {
  type: 'booking:requested';
  payload: {
    bookingRequestId: string;
    loadId: string;
    brokerUserId: string;
    brokerOrgId: string;
    carrierUserId: string;
    carrierOrgId: string;
    proposedRate: number | null;
  };
}

export interface BookingConfirmedEvent extends BaseDomainEvent {
  type: 'booking:confirmed';
  payload: {
    loadId: string;
    bookingRequestId: string;
    brokerUserId: string;
    carrierUserId: string;
    carrierOrgId: string;
  };
}

export interface BookingDeniedEvent extends BaseDomainEvent {
  type: 'booking:denied';
  payload: {
    loadId: string;
    bookingRequestId: string;
    brokerUserId: string;
    carrierUserId: string;
  };
}

export interface CounterOfferSubmittedEvent extends BaseDomainEvent {
  type: 'counteroffer:submitted';
  payload: {
    counterOfferId: string;
    loadId: string;
    offeredBy: string;
    offeredTo: string;
    proposedRate: number | null;
  };
}

export interface CounterOfferAcceptedEvent extends BaseDomainEvent {
  type: 'counteroffer:accepted';
  payload: {
    counterOfferId: string;
    loadId: string;
    acceptedBy: string;
    acceptedByRole: string;
  };
}

export interface TruckRequestCreatedEvent extends BaseDomainEvent {
  type: 'truckrequest:created';
  payload: {
    truckRequestId: string;
    loadId: string;
    brokerOrgId: string;
    carrierOrgId: string;
  };
}

export interface UserRegisteredEvent extends BaseDomainEvent {
  type: 'user:registered';
  payload: {
    userId: string;
    email: string;
    role: string;
  };
}

export interface TeamInviteSentEvent extends BaseDomainEvent {
  type: 'team:invite-sent';
  payload: {
    inviteId: string;
    orgId: string;
    invitedBy: string;
    inviteeEmail: string;
    role: string;
  };
}
