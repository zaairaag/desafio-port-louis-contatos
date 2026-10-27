import type { RequestHandler } from 'express';
import type { ZodError, ZodType } from 'zod';
import { ValidationError } from '../errors/validation-error.js';
import type { ValidationDetail } from '../errors/validation-error.js';
import type { ContactRouteLocals } from '../../modules/contacts/contact.types.js';

function toValidationDetails(error: ZodError, rootField?: string): ValidationDetail[] {
  return error.issues.map((issue) => ({
    field: rootField ?? issue.path.map(String).join('.'),
    message: issue.message,
  }));
}

export function validateBody<Output, Input>(schema: ZodType<Output, Input>): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(new ValidationError(toValidationDetails(result.error)));
      return;
    }

    request.body = result.data;
    next();
  };
}

export function validateContactId(
  schema: ZodType<number, string>,
): RequestHandler<{ id: string }, unknown, unknown, unknown, ContactRouteLocals> {
  return (request, response, next) => {
    const result = schema.safeParse(request.params.id);

    if (!result.success) {
      next(new ValidationError(toValidationDetails(result.error, 'id')));
      return;
    }

    response.locals.contactId = result.data;
    next();
  };
}
