export const LOAD_STATUSES = [
  'draft',
  'created', // backward compatibility alias for 'draft'
  'posted',
  'booked',
  'in_transit',
  'delivered',
  'completed',
  'cancelled',
  'archived',
] as const;

export type LoadStatus = (typeof LOAD_STATUSES)[number];

export const TERMINAL_STATUSES: ReadonlySet<LoadStatus> = new Set([
  'completed',
  'cancelled',
  'archived',
]);

export const ACTIVE_STATUSES: ReadonlySet<LoadStatus> = new Set(
  LOAD_STATUSES.filter((s) => !TERMINAL_STATUSES.has(s)),
);

export function isTerminal(status: LoadStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function isActive(status: LoadStatus): boolean {
  return !isTerminal(status);
}

export function normalizeStatus(status: string): LoadStatus {
  // Backward compat: treat 'created' as 'draft'
  if (status === 'created') return 'draft';
  return status as LoadStatus;
}

const VALID_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  // draft (and legacy 'created') can go to posted or cancelled
  draft: new Set(['posted', 'cancelled']),
  created: new Set(['posted', 'cancelled']),

  // posted can go to booked or cancelled
  posted: new Set(['booked', 'cancelled']),

  // booked can go to in_transit or cancelled
  booked: new Set(['in_transit', 'cancelled']),

  // in_transit can ONLY go to delivered (NOT cancelled per spec)
  in_transit: new Set(['delivered']),

  // delivered can go to completed
  delivered: new Set(['completed']),

  // terminal states
  completed: new Set(),
  cancelled: new Set(),
  archived: new Set(),
};

export function isValidTransition(from: LoadStatus, to: LoadStatus): boolean {
  // Normalize 'created' → 'draft' for transition validation
  const fromKey = from === 'created' ? 'draft' : from;
  return VALID_TRANSITIONS[fromKey]?.has(to) ?? false;
}
