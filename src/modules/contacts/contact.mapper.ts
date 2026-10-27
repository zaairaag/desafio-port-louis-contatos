import type { CreateContactDto, UpdateContactDto } from './contact.schemas.js';
import type {
  Contact,
  ContactResponse,
  ContactRow,
  CreateContactInput,
  UpdateContactInput,
} from './contact.types.js';

export function toCreateContactInput(dto: CreateContactDto): CreateContactInput {
  return { name: dto.nome, phone: dto.telefone };
}

export function toUpdateContactInput(dto: UpdateContactDto): UpdateContactInput {
  return {
    ...(dto.nome === undefined ? {} : { name: dto.nome }),
    ...(dto.telefone === undefined ? {} : { phone: dto.telefone }),
  };
}

export function toContactResponse(contact: Contact): ContactResponse {
  return { id: contact.id, nome: contact.name, telefone: contact.phone };
}

export function toContactFromRow(row: ContactRow): Contact {
  return { id: row.id, name: row.name, phone: row.phone };
}
