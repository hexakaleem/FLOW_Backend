export const PERMISSIONS = {
  LOADS_VIEW: 'loads.view',
  LOADS_BOOK: 'loads.book',
  LOADS_CANCEL: 'loads.cancel',
  FLEET_VIEW: 'fleet.view',
  FLEET_MANAGE: 'fleet.manage',
  FLEET_ASSIGN_DRIVERS: 'fleet.assign_drivers',
  TEAM_VIEW: 'team.view',
  TEAM_MANAGE: 'team.manage',
  PAYMENTS_VIEW: 'payments.view',
  ANALYTICS_VIEW: 'analytics.view',
  DOCUMENTS_VIEW: 'documents.view',
  DOCUMENTS_UPLOAD: 'documents.upload',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSIONS_ARRAY = Object.values(PERMISSIONS) as Permission[];

// Default permissions for each role
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: Object.values(PERMISSIONS),
  broker: [
    PERMISSIONS.LOADS_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
  ],
  carrier: Object.values(PERMISSIONS), // Carrier owner gets all
  independent_driver: [
    PERMISSIONS.LOADS_VIEW,
    PERMISSIONS.LOADS_BOOK,
    PERMISSIONS.LOADS_CANCEL,
    PERMISSIONS.FLEET_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
  ],
  company_driver: [
    PERMISSIONS.LOADS_VIEW,
    PERMISSIONS.FLEET_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
  ],
};
