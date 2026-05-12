export const ROLES = {
  ADMIN: 'admin',
  BROKER: 'broker',
  CARRIER: 'carrier',
  INDEPENDENT_DRIVER: 'independent_driver',
  COMPANY_DRIVER: 'company_driver',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLES_ARRAY = Object.values(ROLES) as Role[];

export function isCarrierRole(role: Role): boolean {
  return role === ROLES.CARRIER;
}

export function isBrokerRole(role: Role): boolean {
  return role === ROLES.BROKER;
}

export function isDriverRole(role: Role): boolean {
  return role === ROLES.INDEPENDENT_DRIVER || role === ROLES.COMPANY_DRIVER;
}

export function isAdminRole(role: Role): boolean {
  return role === ROLES.ADMIN;
}
