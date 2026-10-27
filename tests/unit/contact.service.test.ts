import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { ContactService } from '../../src/modules/contacts/contact.service.js';
import type { Contact, ContactRepository } from '../../src/modules/contacts/contact.types.js';
import { ERROR_CODES } from '../../src/shared/errors/error-codes.js';

const CONTACT: Contact = { id: 1, name: 'João Silva', phone: '11987654321' };

type RepositoryMocks = {
  create: Mock<ContactRepository['create']>;
  findAll: Mock<ContactRepository['findAll']>;
  findById: Mock<ContactRepository['findById']>;
  update: Mock<ContactRepository['update']>;
  delete: Mock<ContactRepository['delete']>;
};

function createContactService(): { service: ContactService; mocks: RepositoryMocks } {
  const mocks: RepositoryMocks = {
    create: vi.fn<ContactRepository['create']>(),
    findAll: vi.fn<ContactRepository['findAll']>(),
    findById: vi.fn<ContactRepository['findById']>(),
    update: vi.fn<ContactRepository['update']>(),
    delete: vi.fn<ContactRepository['delete']>(),
  };
  const repository: ContactRepository = mocks;
  return { service: new ContactService(repository), mocks };
}

describe('ContactService', () => {
  it('creates a contact through the repository', async () => {
    const { service, mocks } = createContactService();
    mocks.create.mockResolvedValue(CONTACT);

    await expect(service.create({ name: CONTACT.name, phone: CONTACT.phone })).resolves.toBe(
      CONTACT,
    );
    expect(mocks.create).toHaveBeenCalledWith({ name: CONTACT.name, phone: CONTACT.phone });
  });

  it('lists contacts from the repository', async () => {
    const { service, mocks } = createContactService();
    mocks.findAll.mockResolvedValue([CONTACT]);

    await expect(service.list()).resolves.toEqual([CONTACT]);
  });

  it('returns an empty list when the repository has no contacts', async () => {
    const { service, mocks } = createContactService();
    mocks.findAll.mockResolvedValue([]);

    await expect(service.list()).resolves.toEqual([]);
  });

  it.each([
    [{ name: 'Ana Paula Souza' }, { id: 1, name: 'Ana Paula Souza', phone: '11987654321' }],
    [{ phone: '1134567890' }, { id: 1, name: 'João Silva', phone: '1134567890' }],
    [
      { name: 'Ana Paula Souza', phone: '1134567890' },
      { id: 1, name: 'Ana Paula Souza', phone: '1134567890' },
    ],
  ])('merges the patch %j into the existing contact', async (patch, expected) => {
    const { service, mocks } = createContactService();
    mocks.findById.mockResolvedValue(CONTACT);
    mocks.update.mockResolvedValue(undefined);

    await expect(service.update(CONTACT.id, patch)).resolves.toEqual(expected);
    expect(mocks.update).toHaveBeenCalledWith(CONTACT.id, patch);
  });

  it('succeeds when the update keeps the stored values', async () => {
    const { service, mocks } = createContactService();
    mocks.findById.mockResolvedValue(CONTACT);
    mocks.update.mockResolvedValue(undefined);

    await expect(
      service.update(CONTACT.id, { name: CONTACT.name, phone: CONTACT.phone }),
    ).resolves.toEqual(CONTACT);
  });

  it('throws a not-found error and skips the update when the contact is absent', async () => {
    const { service, mocks } = createContactService();
    mocks.findById.mockResolvedValue(null);

    await expect(service.update(99, { name: 'Ana Paula Souza' })).rejects.toMatchObject({
      code: ERROR_CODES.CONTACT_NOT_FOUND,
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('deletes an existing contact', async () => {
    const { service, mocks } = createContactService();
    mocks.findById.mockResolvedValue(CONTACT);
    mocks.delete.mockResolvedValue(undefined);

    await expect(service.delete(CONTACT.id)).resolves.toBeUndefined();
    expect(mocks.delete).toHaveBeenCalledWith(CONTACT.id);
  });

  it('throws a not-found error and skips the delete when the contact is absent', async () => {
    const { service, mocks } = createContactService();
    mocks.findById.mockResolvedValue(null);

    await expect(service.delete(99)).rejects.toMatchObject({
      code: ERROR_CODES.CONTACT_NOT_FOUND,
    });
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it('propagates repository failures', async () => {
    const { service, mocks } = createContactService();
    mocks.create.mockRejectedValue(new Error('Database unavailable'));

    await expect(service.create({ name: 'João Silva', phone: '11987654321' })).rejects.toThrow(
      'Database unavailable',
    );
  });
});
