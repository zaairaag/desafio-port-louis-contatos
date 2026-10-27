import { config } from 'dotenv';
import pino from 'pino';
import { z } from 'zod';

config({ quiet: true });

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const ENVIRONMENT_SCHEMA = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().min(1),
});

const parsedEnvironment = ENVIRONMENT_SCHEMA.safeParse(process.env);

if (!parsedEnvironment.success) {
  const problems = parsedEnvironment.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
  pino({ level: 'error' }, pino.destination(2)).error({ problems }, 'Invalid environment');
  process.exit(1);
}

export const env = Object.freeze({
  ...parsedEnvironment.data,
  isDevelopment: parsedEnvironment.data.NODE_ENV === 'development',
});
