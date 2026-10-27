import { AppError } from './app-error.js';
import { ERROR_CODES, VALIDATION_ERROR_MESSAGE } from './error-codes.js';
import { HTTP_STATUS } from '../http/http-status.js';

export type ValidationDetail = {
  field: string;
  message: string;
};

export class ValidationError extends AppError {
  readonly details: ValidationDetail[];

  constructor(details: ValidationDetail[]) {
    super(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, VALIDATION_ERROR_MESSAGE);
    this.details = details;
  }
}
