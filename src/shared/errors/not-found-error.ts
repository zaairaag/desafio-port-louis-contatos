import { AppError } from './app-error.js';
import type { ErrorCode } from './error-codes.js';
import { HTTP_STATUS } from '../http/http-status.js';

export class NotFoundError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(HTTP_STATUS.NOT_FOUND, code, message);
  }
}
