import { CONTACT_NOT_FOUND_MESSAGE, ERROR_CODES } from '../../shared/errors/error-codes.js';
import { NotFoundError } from '../../shared/errors/not-found-error.js';
import type {
  Contact,
  ContactRepository,
  CreateContactInput,
  UpdateContactInput,
} from './contact.types.js';

export class ContactService {
  constructor(private readonly repository: ContactRepository) {}

  create(input: CreateContactInput): Promise<Contact> {
    return this.repository.create(input);
  }

  list(): Promise<Contact[]> {
    return this.repository.findAll();
  }

  async update(id: number, input: UpdateContactInput): Promise<Contact> {
    const current = await this.repository.findById(id);

    if (current === null) {
      throw new NotFoundError(ERROR_CODES.CONTACT_NOT_FOUND, CONTACT_NOT_FOUND_MESSAGE);
    }

    await this.repository.update(id, input);

    return {
      id: current.id,
      name: input.name ?? current.name,
      phone: input.phone ?? current.phone,
    };
  }

  async delete(id: number): Promise<void> {
    const current = await this.repository.findById(id);

    if (current === null) {
      throw new NotFoundError(ERROR_CODES.CONTACT_NOT_FOUND, CONTACT_NOT_FOUND_MESSAGE);
    }

    await this.repository.delete(id);
  }
}
