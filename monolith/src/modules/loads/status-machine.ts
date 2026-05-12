import { isValidTransition, LoadStatus } from '@flow/shared';
import { AppError } from '../../lib/errors';

function validateTransition(from: LoadStatus, to: LoadStatus): void {
  if (!isValidTransition(from, to)) {
    throw AppError.conflict(
      'INVALID_TRANSITION',
      `Cannot transition from ${from} to ${to}`,
    );
  }
}

export { isValidTransition, validateTransition };
