export const BOOKING_STATUSES = ['pending', 'accepted', 'denied', 'cancelled', 'expired'] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];
