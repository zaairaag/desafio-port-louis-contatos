export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_JSON: 'INVALID_JSON',
  CONTACT_NOT_FOUND: 'CONTACT_NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const VALIDATION_ERROR_MESSAGE = 'Invalid request data';
export const INVALID_JSON_MESSAGE = 'Request body is not valid JSON';
export const CONTACT_NOT_FOUND_MESSAGE = 'Contact not found';
export const ROUTE_NOT_FOUND_MESSAGE = 'Route not found';
export const PAYLOAD_TOO_LARGE_MESSAGE = 'Request body exceeds the 10kb limit';
export const INTERNAL_ERROR_MESSAGE = 'Unexpected error';
