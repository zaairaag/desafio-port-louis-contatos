import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

export default async function setup(): Promise<void> {
  config({
    path: fileURLToPath(new URL('../../.env.test', import.meta.url)),
    override: true,
    quiet: true,
  });

  const { runMigrations } = await import('../../src/database/migrate.js');
  await runMigrations();
}
