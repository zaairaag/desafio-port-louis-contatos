import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import type { ContactBody, ErrorBody } from '../helpers/contracts.js';
import '../setup/integration-hooks.js';

const app = createApp();

async function createContact(name = 'João Silva'): Promise<ContactBody> {
  const response = await request(app)
    .post('/contatos')
    .send({ nome: name, telefone: '(11) 98765-4321' });
  return response.body as ContactBody;
}

describe('DELETE /contatos/:id', () => {
  it('deletes the contact and returns 204 with an empty body', async () => {
    const contact = await createContact();

    const response = await request(app).delete(`/contatos/${String(contact.id)}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');

    const list = await request(app).get('/contatos');
    expect(list.body).toEqual([]);
  });

  it('returns 404 when deleting the same contact twice', async () => {
    const contact = await createContact();

    await request(app).delete(`/contatos/${String(contact.id)}`);
    const response = await request(app).delete(`/contatos/${String(contact.id)}`);
    const body = response.body as ErrorBody;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('CONTACT_NOT_FOUND');
    expect(body.error.message).toBeTypeOf('string');
    expect(body.error.details).toBeUndefined();
  });

  it('returns 404 when the contact does not exist', async () => {
    const response = await request(app).delete('/contatos/999999');

    expect(response.status).toBe(404);
    expect((response.body as ErrorBody).error.code).toBe('CONTACT_NOT_FOUND');
  });

  it.each(['abc', '0', '4294967296'])('rejects the id %j with 400', async (id) => {
    const response = await request(app).delete(`/contatos/${id}`);
    const body = response.body as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.details?.length).toBe(1);
    expect(body.error.details?.[0]?.field).toBe('id');
    expect(body.error.details?.[0]?.message).toBeTypeOf('string');
  });

  it('keeps other contacts untouched', async () => {
    const first = await createContact('João Silva');
    const second = await createContact('Ana Paula Souza');

    await request(app).delete(`/contatos/${String(first.id)}`);
    const list = await request(app).get('/contatos');

    expect(list.body).toEqual([second]);
  });
});
