import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import {
  ERROR_CODES,
  INTERNAL_ERROR_MESSAGE,
  INVALID_JSON_MESSAGE,
  PAYLOAD_TOO_LARGE_MESSAGE,
} from '../errors/error-codes.js';
import { toLoggedError } from '../errors/error-log.js';
import { ValidationError } from '../errors/validation-error.js';
import { HTTP_STATUS } from '../http/http-status.js';
import { logger } from '../logger/logger.js';

type BodyParserError = {
  type: string;
};

function isBodyParserError(error: unknown): error is BodyParserError {
  if (typeof error !== 'object' || error === null || !('type' in error)) {
    return false;
  }

  return typeof error.type === 'string';
}

export function createErrorHandler(): ErrorRequestHandler {
  return (error: unknown, _request, response, _next) => {
    if (error instanceof AppError) {
      const body =
        error instanceof ValidationError
          ? { error: { code: error.code, message: error.message, details: error.details } }
          : { error: { code: error.code, message: error.message } };
      response.status(error.statusCode).json(body);
      return;
    }

    if (isBodyParserError(error) && error.type === 'entity.parse.failed') {
      response
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ error: { code: ERROR_CODES.INVALID_JSON, message: INVALID_JSON_MESSAGE } });
      return;
    }

    if (isBodyParserError(error) && error.type === 'entity.too.large') {
      response.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).json({
        error: { code: ERROR_CODES.PAYLOAD_TOO_LARGE, message: PAYLOAD_TOO_LARGE_MESSAGE },
      });
      return;
    }

    logger.error({ error: toLoggedError(error) }, 'Unexpected error');
    response
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ error: { code: ERROR_CODES.INTERNAL_ERROR, message: INTERNAL_ERROR_MESSAGE } });
  };
}
