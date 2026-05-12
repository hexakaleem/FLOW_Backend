export const TRUCK_STATUSES = [
  'available',
  'assigned',
  'en_route',
  'loading',
  'loaded',
  'in_transit',
  'unloading',
  'maintenance',
  'decommissioned',
] as const;

export type TruckStatus = (typeof TRUCK_STATUSES)[number];

export function isOperational(status: TruckStatus): boolean {
  return status !== 'decommissioned';
}
