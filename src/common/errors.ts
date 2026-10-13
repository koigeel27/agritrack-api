import { HttpException, HttpStatus } from '@nestjs/common';

// Every error leaves the API as { success: false, error: { code, message, details? } }.
// This helper builds the pieces; AllExceptionsFilter sends them.
export function apiError(status: HttpStatus, code: string, message: string, details?: Record<string, string>) {
  return new HttpException({ code, message, ...(details ? { details } : {}) }, status);
}

export const validationError = (details: Record<string, string>) =>
  apiError(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', 'Validation failed.', details);
