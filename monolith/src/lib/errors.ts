import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static notFound(entity: string, id: string): AppError {
    return new AppError(404, `${entity.toUpperCase()}_NOT_FOUND`, `${entity} not found: ${id}`);
  }

  static forbidden(message = 'You do not have access to this resource'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static badRequest(code: string, message: string): AppError {
    return new AppError(400, code, message);
  }

  static conflict(code: string, message: string): AppError {
    return new AppError(409, code, message);
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
}

export class ValidationError extends AppError {
  constructor(fields: Record<string, string>) {
    super(400, 'VALIDATION_ERROR', 'Validation failed', { fields });
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export function globalErrorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (error.name === 'ValidationError') {
    const mongooseError = error as unknown as {
      errors: Record<string, { message: string }>;
    };
    const fields: Record<string, string> = {};

    for (const [field, fieldError] of Object.entries(mongooseError.errors)) {
      fields[field] = fieldError.message;
    }

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { fields },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if ((error as unknown as { code: number }).code === 11000) {
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: 'A record with that value already exists',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  console.error('[ERROR]', error);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}
