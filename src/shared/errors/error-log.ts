export type LoggedError = {
  name: string;
  message: string;
  stack?: string;
};

export function toLoggedError(error: unknown): LoggedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack === undefined ? {} : { stack: error.stack }),
    };
  }
  return { name: 'UnknownError', message: 'A non-error value was thrown' };
}
