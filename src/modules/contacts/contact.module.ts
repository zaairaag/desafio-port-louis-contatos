import type { Router } from 'express';
import { pool } from '../../database/connection.js';
import { ContactController } from './contact.controller.js';
import { MysqlContactRepository } from './contact.repository.js';
import { createContactRouter } from './contact.routes.js';
import { ContactService } from './contact.service.js';

export function createContactsRouter(): Router {
  const repository = new MysqlContactRepository(pool);
  const service = new ContactService(repository);
  const controller = new ContactController(service);
  return createContactRouter(controller);
}
