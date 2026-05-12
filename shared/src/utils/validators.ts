const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

const PASSWORD_UPPER = /[A-Z]/;
const PASSWORD_LOWER = /[a-z]/;
const PASSWORD_DIGIT = /[0-9]/;

const US_STATES: ReadonlySet<string> = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI',
  'WY',
]);

const ZIP_REGEX = /^\d{5}(?:-\d{4})?$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    PASSWORD_UPPER.test(password) &&
    PASSWORD_LOWER.test(password) &&
    PASSWORD_DIGIT.test(password)
  );
}

export function isValidVin(vin: string): boolean {
  return VIN_REGEX.test(vin);
}

export function isValidUsState(state: string): boolean {
  return US_STATES.has(state.toUpperCase());
}

export function isValidUsZip(zip: string): boolean {
  return ZIP_REGEX.test(zip);
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
