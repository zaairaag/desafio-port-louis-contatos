import type { RequestHandler } from 'express';
import { ERROR_CODES, ROUTE_NOT_FOUND_MESSAGE } from '../errors/error-codes.js';
import { NotFoundError } from '../errors/not-found-error.js';

export function createNotFoundHandler(): RequestHandler {
  return (_request, _response, next) => {
    next(new NotFoundError(ERROR_CODES.ROUTE_NOT_FOUND, ROUTE_NOT_FOUND_MESSAGE));
  };
}
