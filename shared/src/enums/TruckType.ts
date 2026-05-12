export const TRUCK_TYPES = [
  'dry_van',
  'flatbed',
  'reefer',
  'step_deck',
  'lowboy',
  'tanker',
  'power_only',
  'sprinter_van',
  'box_truck',
  'hot_shot',
  'heavy_haul',
  'conestoga',
] as const;

export type TruckType = (typeof TRUCK_TYPES)[number];
