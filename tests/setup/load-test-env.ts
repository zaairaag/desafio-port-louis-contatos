import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

const localEnvironment = config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  processEnv: {},
  quiet: true,
}).parsed;

config({
  path: fileURLToPath(new URL('../../.env.test', import.meta.url)),
  override: true,
  quiet: true,
});

if (localEnvironment?.DB_PORT !== undefined) {
  process.env.DB_PORT = localEnvironment.DB_PORT;
}
