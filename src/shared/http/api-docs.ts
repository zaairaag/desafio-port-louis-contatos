import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';

const OPENAPI_FILE_PATH = fileURLToPath(new URL('../../../docs/openapi.yaml', import.meta.url));

export function createApiDocsRouter(): Router {
  const document = parse(readFileSync(OPENAPI_FILE_PATH, 'utf8')) as swaggerUi.JsonObject;
  const router = Router();

  router.use((request, response, next) => {
    if (request.path === '/swagger-ui-init.js') {
      response.setHeader('Cache-Control', 'no-store');
    }
    next();
  });
  router.use('/', swaggerUi.serve, swaggerUi.setup(document));
  return router;
}
