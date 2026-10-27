import { env } from '../../src/config/env.js';
import { pool } from '../../src/database/connection.js';

export async function resetContacts(): Promise<void> {
  if (!env.DB_NAME.endsWith('_test')) {
    throw new Error('Refusing to truncate a database that is not a test database');
  }

  await pool.execute('TRUNCATE TABLE contacts');
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
