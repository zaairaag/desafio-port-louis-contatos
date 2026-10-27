import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './database/connection.js';
import { toLoggedError } from './shared/errors/error-log.js';
import { logger } from './shared/logger/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, docsUrl: `http://localhost:${String(env.PORT)}/docs` },
    'Contacts API started',
  );
});

let isShuttingDown = false;

function closeHttpServer(): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<undefined>();

  server.close((error) => {
    if (error === undefined) {
      resolve(undefined);
      return;
    }

    reject(error);
  });

  return promise;
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, 'Shutting down');

  try {
    await closeHttpServer();
    await pool.end();
    logger.info('Shutdown complete');
    process.exitCode = 0;
  } catch (error) {
    logger.error({ error: toLoggedError(error) }, 'Shutdown failed');
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
