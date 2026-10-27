import './load-test-env.js';

export default async function setup(): Promise<void> {
  const { runMigrations } = await import('../../src/database/migrate.js');
  await runMigrations();
}
