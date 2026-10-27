import type { RequestHandler } from 'express';
import { HTTP_STATUS } from '../../shared/http/http-status.js';
import { toContactResponse, toCreateContactInput, toUpdateContactInput } from './contact.mapper.js';
import type { CreateContactDto, UpdateContactDto } from './contact.schemas.js';
import type { ContactService } from './contact.service.js';
import type { ContactResponse, ContactRouteLocals } from './contact.types.js';

type ContactParams = { id: string };

export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  readonly createContact: RequestHandler<
    Record<string, string>,
    ContactResponse,
    CreateContactDto
  > = async (request, response) => {
    const contact = await this.contactService.create(toCreateContactInput(request.body));
    response.status(HTTP_STATUS.CREATED).json(toContactResponse(contact));
  };

  readonly listContacts: RequestHandler<Record<string, string>, ContactResponse[]> = async (
    _request,
    response,
  ) => {
    const contacts = await this.contactService.list();
    response.status(HTTP_STATUS.OK).json(contacts.map(toContactResponse));
  };

  readonly updateContact: RequestHandler<
    ContactParams,
    ContactResponse,
    UpdateContactDto,
    unknown,
    ContactRouteLocals
  > = async (request, response) => {
    const contact = await this.contactService.update(
      response.locals.contactId,
      toUpdateContactInput(request.body),
    );
    response.status(HTTP_STATUS.OK).json(toContactResponse(contact));
  };

  readonly deleteContact: RequestHandler<
    ContactParams,
    void,
    unknown,
    unknown,
    ContactRouteLocals
  > = async (_request, response) => {
    await this.contactService.delete(response.locals.contactId);
    response.status(HTTP_STATUS.NO_CONTENT).end();
  };
}
