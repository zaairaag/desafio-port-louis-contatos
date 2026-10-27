export type LoggedError = {
  name: string;
  message: string;
};

export function toLoggedError(error: unknown): LoggedError {
  if (error instanceof Error) {
    return {
      name: 'Error',
      message: 'Error details omitted to protect sensitive data',
    };
  }
  return { name: 'UnknownError', message: 'A non-error value was thrown' };
}
