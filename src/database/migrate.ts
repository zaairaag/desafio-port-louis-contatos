import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'mysql2/promise';
import { env } from '../config/env.js';
import { toLoggedError } from '../shared/errors/error-log.js';
import { logger } from '../shared/logger/logger.js';

const MIGRATIONS_DIRECTORY = new URL('../../database/migrations/', import.meta.url);

export async function runMigrations(): Promise<number> {
  const connection = await createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
    charset: 'utf8mb4_unicode_ci',
  });

  try {
    const filenames = (await readdir(MIGRATIONS_DIRECTORY))
      .filter((filename) => filename.endsWith('.sql'))
      .sort();

    for (const filename of filenames) {
      const sql = await readFile(new URL(filename, MIGRATIONS_DIRECTORY), 'utf8');
      await connection.query(sql);
    }

    return filenames.length;
  } finally {
    await connection.end();
  }
}

const isDirectExecution = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  try {
    const appliedMigrations = await runMigrations();
    logger.info({ appliedMigrations }, 'Database migrations applied');
  } catch (error) {
    logger.error({ error: toLoggedError(error) }, 'Database migration failed');
    process.exitCode = 1;
  }
}
