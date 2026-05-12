import { isValidUsState, isValidUsZip } from './validators';

interface AddressInput {
  line1: string;
  city: string;
  state: string;
  zip: string;
}

export function isValidAddress(address: AddressInput): boolean {
  const hasRequiredFields =
    typeof address.line1 === 'string' &&
    address.line1.trim().length > 0 &&
    typeof address.city === 'string' &&
    address.city.trim().length > 0 &&
    typeof address.state === 'string' &&
    typeof address.zip === 'string';

  if (!hasRequiredFields) {
    return false;
  }

  return isValidUsState(address.state) && isValidUsZip(address.zip);
}
