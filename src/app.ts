import express from 'express';
import type { Express } from 'express';
import helmet from 'helmet';
import { createContactsRouter } from './modules/contacts/contact.module.js';
import { createApiDocsRouter } from './shared/http/api-docs.js';
import { createErrorHandler } from './shared/middlewares/error-handler.js';
import { createNotFoundHandler } from './shared/middlewares/not-found-handler.js';

const JSON_BODY_LIMIT = '10kb';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use('/docs', createApiDocsRouter());
  app.use(helmet());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use('/contatos', createContactsRouter());
  app.use(createNotFoundHandler());
  app.use(createErrorHandler());

  return app;
}
