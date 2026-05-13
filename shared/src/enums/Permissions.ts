export const PERMISSIONS = {
  // ── Loads ──────────────────────────────────────────────────────────────────
  LOADS_VIEW: 'loads.view',
  LOADS_BOOK: 'loads.book',
  LOADS_CANCEL: 'loads.cancel',

  // ── Fleet ──────────────────────────────────────────────────────────────────
  FLEET_VIEW: 'fleet.view',
  FLEET_MANAGE: 'fleet.manage',
  FLEET_ASSIGN_DRIVERS: 'fleet.assign_drivers',

  // ── Team ───────────────────────────────────────────────────────────────────
  TEAM_VIEW: 'team.view',
  TEAM_MANAGE: 'team.manage',

  // ── Payments & Analytics ──────────────────────────────────────────────────
  PAYMENTS_VIEW: 'payments.view',
  ANALYTICS_VIEW: 'analytics.view',

  // ── Documents ─────────────────────────────────────────────────────────────
  DOCUMENTS_VIEW: 'documents.view',
  DOCUMENTS_UPLOAD: 'documents.upload',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSIONS_ARRAY = Object.values(PERMISSIONS) as Permission[];

// ── Gateway permission strings ─────────────────────────────────────────────
// The gateway uses colon-separated permission names (e.g. 'load:book') while
// the monolith historically used dot-separated names (e.g. 'loads.book').
// Both sets must be included in default permissions so the gateway's
// requirePermission middleware passes.

const GATEWAY_PERMISSIONS = {
  // Loads
  LOAD_CREATE: 'load:create',
  LOAD_READ: 'load:read',
  LOAD_UPDATE: 'load:update',
  LOAD_BOOK: 'load:book',
  LOAD_CANCEL: 'load:cancel',
  // Fleet
  FLEET_READ: 'fleet:read',
  FLEET_WRITE: 'fleet:write',
  FLEET_DELETE: 'fleet:delete',
  // Marketplace
  MARKETPLACE_READ: 'marketplace:read',
  MARKETPLACE_WRITE: 'marketplace:write',
  // Documents
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_WRITE: 'documents:write',
  DOCUMENTS_UPLOAD_GW: 'documents.upload',
  // User / Team (gateway)
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  TEAM_READ: 'team:read',
  TEAM_INVITE: 'team:invite',
  TEAM_MANAGE_GW: 'team:manage',
  TEAM_ROLES_MANAGE: 'team:roles:manage',
  // Analytics / Notifications / Devices
  ANALYTICS_READ: 'analytics:read',
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_WRITE: 'notifications:write',
  DEVICES_WRITE: 'devices:write',
  MESSAGES_READ: 'messages:read',
  MESSAGES_WRITE: 'messages:write',
  REVIEWS_READ: 'reviews:read',
  REVIEWS_WRITE: 'reviews:write',
  TICKETS_READ: 'tickets:read',
  TICKETS_WRITE: 'tickets:write',
} as const;

// Default permissions for each role
// Includes BOTH dot-format (monolith RBAC) and colon-format (gateway RBAC)
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: [
    ...Object.values(PERMISSIONS),
    ...Object.values(GATEWAY_PERMISSIONS),
  ],
  broker: [
    // Monolith format
    PERMISSIONS.LOADS_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    // Gateway format — broker creates/manages loads
    GATEWAY_PERMISSIONS.LOAD_CREATE,
    GATEWAY_PERMISSIONS.LOAD_READ,
    GATEWAY_PERMISSIONS.LOAD_UPDATE,
    GATEWAY_PERMISSIONS.LOAD_CANCEL,
    GATEWAY_PERMISSIONS.FLEET_READ,
    GATEWAY_PERMISSIONS.FLEET_WRITE,
    GATEWAY_PERMISSIONS.FLEET_DELETE,
    GATEWAY_PERMISSIONS.MARKETPLACE_READ,
    GATEWAY_PERMISSIONS.MARKETPLACE_WRITE,
    GATEWAY_PERMISSIONS.DOCUMENTS_READ,
    GATEWAY_PERMISSIONS.DOCUMENTS_WRITE,
    GATEWAY_PERMISSIONS.DOCUMENTS_UPLOAD_GW,
    GATEWAY_PERMISSIONS.USER_READ,
    GATEWAY_PERMISSIONS.USER_WRITE,
    GATEWAY_PERMISSIONS.TEAM_READ,
    GATEWAY_PERMISSIONS.TEAM_INVITE,
    GATEWAY_PERMISSIONS.TEAM_MANAGE_GW,
    GATEWAY_PERMISSIONS.TEAM_ROLES_MANAGE,
    GATEWAY_PERMISSIONS.ANALYTICS_READ,
    GATEWAY_PERMISSIONS.NOTIFICATIONS_READ,
    GATEWAY_PERMISSIONS.NOTIFICATIONS_WRITE,
    GATEWAY_PERMISSIONS.DEVICES_WRITE,
    GATEWAY_PERMISSIONS.MESSAGES_READ,
    GATEWAY_PERMISSIONS.MESSAGES_WRITE,
    GATEWAY_PERMISSIONS.REVIEWS_READ,
    GATEWAY_PERMISSIONS.REVIEWS_WRITE,
    GATEWAY_PERMISSIONS.TICKETS_READ,
    GATEWAY_PERMISSIONS.TICKETS_WRITE,
  ],
  carrier: [
    // Carrier owner gets all permissions
    ...Object.values(PERMISSIONS),
    ...Object.values(GATEWAY_PERMISSIONS),
  ],
  independent_driver: [
    // Monolith format
    PERMISSIONS.LOADS_VIEW,
    PERMISSIONS.LOADS_BOOK,
    PERMISSIONS.LOADS_CANCEL,
    PERMISSIONS.FLEET_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    // Gateway format — driver browses marketplace, books loads, manages own truck
    GATEWAY_PERMISSIONS.LOAD_READ,
    GATEWAY_PERMISSIONS.LOAD_BOOK,
    GATEWAY_PERMISSIONS.LOAD_CANCEL,
    GATEWAY_PERMISSIONS.LOAD_UPDATE,     // needed for status transitions (delivered etc.)
    GATEWAY_PERMISSIONS.FLEET_READ,
    GATEWAY_PERMISSIONS.FLEET_WRITE,     // needed for truck registration
    GATEWAY_PERMISSIONS.MARKETPLACE_READ,
    GATEWAY_PERMISSIONS.MARKETPLACE_WRITE,
    GATEWAY_PERMISSIONS.DOCUMENTS_READ,
    GATEWAY_PERMISSIONS.DOCUMENTS_WRITE,
    GATEWAY_PERMISSIONS.DOCUMENTS_UPLOAD_GW,
    GATEWAY_PERMISSIONS.USER_READ,
    GATEWAY_PERMISSIONS.USER_WRITE,
    GATEWAY_PERMISSIONS.NOTIFICATIONS_READ,
    GATEWAY_PERMISSIONS.NOTIFICATIONS_WRITE,
    GATEWAY_PERMISSIONS.DEVICES_WRITE,
    GATEWAY_PERMISSIONS.MESSAGES_READ,
    GATEWAY_PERMISSIONS.MESSAGES_WRITE,
    GATEWAY_PERMISSIONS.REVIEWS_READ,
    GATEWAY_PERMISSIONS.REVIEWS_WRITE,
    GATEWAY_PERMISSIONS.TICKETS_READ,
    GATEWAY_PERMISSIONS.TICKETS_WRITE,
  ],
  company_driver: [
    // Monolith format
    PERMISSIONS.LOADS_VIEW,
    PERMISSIONS.FLEET_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    // Gateway format — limited: view loads, view fleet, upload docs
    GATEWAY_PERMISSIONS.LOAD_READ,
    GATEWAY_PERMISSIONS.FLEET_READ,
    GATEWAY_PERMISSIONS.MARKETPLACE_READ,
    GATEWAY_PERMISSIONS.DOCUMENTS_READ,
    GATEWAY_PERMISSIONS.DOCUMENTS_WRITE,
    GATEWAY_PERMISSIONS.DOCUMENTS_UPLOAD_GW,
    GATEWAY_PERMISSIONS.USER_READ,
    GATEWAY_PERMISSIONS.NOTIFICATIONS_READ,
    GATEWAY_PERMISSIONS.NOTIFICATIONS_WRITE,
    GATEWAY_PERMISSIONS.DEVICES_WRITE,
  ],
};
