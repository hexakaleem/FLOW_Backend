export const PERMISSIONS = {
  // ── Loads ──────────────────────────────────────────────────────────────────
  LOAD_CREATE: 'load:create',
  LOAD_READ: 'load:read',
  LOAD_UPDATE: 'load:update',
  LOAD_DELETE: 'load:delete',
  LOAD_BOOK: 'load:book',
  LOAD_CANCEL: 'load:cancel',

  // ── Fleet ──────────────────────────────────────────────────────────────────
  FLEET_READ: 'fleet:read',
  FLEET_WRITE: 'fleet:write',
  FLEET_DELETE: 'fleet:delete',
  FLEET_ASSIGN_DRIVERS: 'fleet:assign_drivers',

  // ── Team ───────────────────────────────────────────────────────────────────
  TEAM_READ: 'team:read',
  TEAM_WRITE: 'team:write',
  TEAM_INVITE: 'team:invite',
  TEAM_ROLES: 'team:roles:manage',

  // ── Marketplace ─────────────────────────────────────────────────────────────
  MARKETPLACE_READ: 'marketplace:read',
  MARKETPLACE_WRITE: 'marketplace:write',

  // ── Documents ─────────────────────────────────────────────────────────────
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_WRITE: 'documents:write',
  DOCUMENTS_UPLOAD: 'documents:upload',

  // ── Payments & Analytics ──────────────────────────────────────────────────
  PAYMENTS_READ: 'payments:read',
  ANALYTICS_READ: 'analytics:read',

  // ── Communication ─────────────────────────────────────────────────────────
  MESSAGES_READ: 'messages:read',
  MESSAGES_WRITE: 'messages:write',
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_WRITE: 'notifications:write',
  DEVICES_WRITE: 'devices:write',

  // ── Support & Reviews ─────────────────────────────────────────────────────
  REVIEWS_READ: 'reviews:read',
  REVIEWS_WRITE: 'reviews:write',
  TICKETS_READ: 'tickets:read',
  TICKETS_WRITE: 'tickets:write',

  // ── User ──────────────────────────────────────────────────────────────────
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSIONS_ARRAY = Object.values(PERMISSIONS) as Permission[];

// Default permissions for each role
// Standardized on colon-format (resource:action)
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: [...Object.values(PERMISSIONS)],
  broker: [
    PERMISSIONS.LOAD_CREATE,
    PERMISSIONS.LOAD_READ,
    PERMISSIONS.LOAD_UPDATE,
    PERMISSIONS.LOAD_CANCEL,
    PERMISSIONS.MARKETPLACE_READ,
    PERMISSIONS.MARKETPLACE_WRITE,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_WRITE,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_WRITE,
    PERMISSIONS.TEAM_READ,
    PERMISSIONS.TEAM_WRITE,
    PERMISSIONS.TEAM_INVITE,
    PERMISSIONS.TEAM_ROLES,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.NOTIFICATIONS_WRITE,
    PERMISSIONS.MESSAGES_READ,
    PERMISSIONS.MESSAGES_WRITE,
    PERMISSIONS.REVIEWS_READ,
    PERMISSIONS.REVIEWS_WRITE,
    PERMISSIONS.TICKETS_READ,
    PERMISSIONS.TICKETS_WRITE,
  ],
  carrier: [...Object.values(PERMISSIONS)],
  independent_driver: [
    PERMISSIONS.LOAD_READ,
    PERMISSIONS.LOAD_BOOK,
    PERMISSIONS.LOAD_CANCEL,
    PERMISSIONS.LOAD_UPDATE,
    PERMISSIONS.FLEET_READ,
    PERMISSIONS.FLEET_WRITE,
    PERMISSIONS.MARKETPLACE_READ,
    PERMISSIONS.MARKETPLACE_WRITE,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_WRITE,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_WRITE,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.NOTIFICATIONS_WRITE,
    PERMISSIONS.DEVICES_WRITE,
    PERMISSIONS.MESSAGES_READ,
    PERMISSIONS.MESSAGES_WRITE,
    PERMISSIONS.REVIEWS_READ,
    PERMISSIONS.REVIEWS_WRITE,
    PERMISSIONS.TICKETS_READ,
    PERMISSIONS.TICKETS_WRITE,
  ],
  company_driver: [
    PERMISSIONS.LOAD_READ,
    PERMISSIONS.FLEET_READ,
    PERMISSIONS.MARKETPLACE_READ,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_WRITE,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.USER_READ,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.NOTIFICATIONS_WRITE,
    PERMISSIONS.DEVICES_WRITE,
  ],
};
