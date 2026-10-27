import type { RequestHandler } from 'express';
import type { ZodError, ZodType } from 'zod';
import { ValidationError } from '../errors/validation-error.js';
import type { ValidationDetail } from '../errors/validation-error.js';
import type { ContactRouteLocals } from '../../modules/contacts/contact.types.js';

const BODY_FIELD = 'body';
const UNKNOWN_FIELD_MESSAGE = 'Field is not allowed';

function toValidationDetails(error: ZodError, rootField?: string): ValidationDetail[] {
  return error.issues.flatMap((issue) => {
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({ field: key, message: UNKNOWN_FIELD_MESSAGE }));
    }

    const path = issue.path.map(String).join('.');

    return [{ field: rootField ?? (path === '' ? BODY_FIELD : path), message: issue.message }];
  });
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
