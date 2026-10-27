import { Router } from 'express';
import { validateBody, validateContactId } from '../../shared/middlewares/validate.js';
import type { ContactController } from './contact.controller.js';
import { contactIdSchema, createContactSchema, updateContactSchema } from './contact.schemas.js';

export function createContactRouter(controller: ContactController): Router {
  const router = Router();

  router.post('/', validateBody(createContactSchema), controller.createContact);
  router.get('/', controller.listContacts);
  router.patch(
    '/:id',
    validateContactId(contactIdSchema),
    validateBody(updateContactSchema),
    controller.updateContact,
  );
  router.delete('/:id', validateContactId(contactIdSchema), controller.deleteContact);

  return router;
}
