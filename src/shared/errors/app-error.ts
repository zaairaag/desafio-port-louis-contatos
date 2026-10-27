import type { HttpStatus } from '../http/http-status.js';
import type { ErrorCode } from './error-codes.js';

export class AppError extends Error {
  readonly statusCode: HttpStatus;
  readonly code: ErrorCode;

  constructor(statusCode: HttpStatus, code: ErrorCode, message: string) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}
