import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import type { ContactBody, ErrorBody } from '../helpers/contracts.js';
import '../setup/integration-hooks.js';

const app = createApp();

async function createContact(): Promise<ContactBody> {
  const response = await request(app)
    .post('/contatos')
    .send({ nome: 'João Silva', telefone: '(11) 98765-4321' });
  return response.body as ContactBody;
}

describe('PATCH /contatos/:id', () => {
  it('updates only the name and keeps the phone', async () => {
    const contact = await createContact();

    const response = await request(app)
      .patch(`/contatos/${String(contact.id)}`)
      .send({ nome: 'Ana Paula Souza' });
    const body = response.body as ContactBody;

    expect(response.status).toBe(200);
    expect(body).toEqual({ ...contact, nome: 'Ana Paula Souza' });

    const list = await request(app).get('/contatos');
    expect(list.body).toEqual([body]);
  });

  it('updates only the phone and keeps the name', async () => {
    const contact = await createContact();

    const response = await request(app)
      .patch(`/contatos/${String(contact.id)}`)
      .send({ telefone: '11 3456-7890' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ...contact, telefone: '1134567890' });
  });

  it('updates both fields', async () => {
    const contact = await createContact();

    const response = await request(app)
      .patch(`/contatos/${String(contact.id)}`)
      .send({
        nome: 'Ana Paula Souza',
        telefone: '(11) 3456-7890',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: contact.id,
      nome: 'Ana Paula Souza',
      telefone: '1134567890',
    });
  });

  it('returns 200 when the update keeps the stored values', async () => {
    const contact = await createContact();

    const response = await request(app)
      .patch(`/contatos/${String(contact.id)}`)
      .send({ nome: contact.nome, telefone: contact.telefone });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(contact);
  });

  it.each([{}, { nome: 'João' }, { telefone: '12345' }, { email: 'joao@example.com' }])(
    'rejects the body %j with 400 and keeps the contact unchanged',
    async (payload) => {
      const contact = await createContact();

      const response = await request(app)
        .patch(`/contatos/${String(contact.id)}`)
        .send(payload);

      expect(response.status).toBe(400);
      expect((response.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');

      const list = await request(app).get('/contatos');
      expect(list.body).toEqual([contact]);
    },
  );

  it('reports an empty update against the body field', async () => {
    const contact = await createContact();

    const response = await request(app)
      .patch(`/contatos/${String(contact.id)}`)
      .send({});
    const body = response.body as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.details).toEqual([
      { field: 'body', message: 'At least one of nome or telefone is required' },
    ]);
  });

  it('reports only the unknown field when the body has no allowed keys', async () => {
    const contact = await createContact();

    const response = await request(app)
      .patch(`/contatos/${String(contact.id)}`)
      .send({ email: 'joao@example.com' });
    const body = response.body as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.details).toEqual([{ field: 'email', message: 'Field is not allowed' }]);
  });

  it('returns 400 when the body is missing', async () => {
    const contact = await createContact();

    const response = await request(app).patch(`/contatos/${String(contact.id)}`);
    const body = response.body as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual([
      { field: 'body', message: 'Request body is required and must be a JSON object' },
    ]);
  });

  it.each(['abc', '0', '4294967296'])(
    'rejects the id %j with 400 before validating the body',
    async (id) => {
      const response = await request(app).patch(`/contatos/${id}`).send({ nome: 'João' });
      const body = response.body as ErrorBody;

      expect(response.status).toBe(400);
      expect(body.error.details?.length).toBe(1);
      expect(body.error.details?.[0]?.field).toBe('id');
      expect(body.error.details?.[0]?.message).toBeTypeOf('string');
    },
  );

  it('returns 404 when the contact does not exist', async () => {
    const response = await request(app).patch('/contatos/999999').send({ nome: 'João Silva' });
    const body = response.body as ErrorBody;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('CONTACT_NOT_FOUND');
    expect(body.error.message).toBeTypeOf('string');
    expect(body.error.details).toBeUndefined();
  });

  it('validates the body before checking existence', async () => {
    const response = await request(app).patch('/contatos/999999').send({ nome: 'João' });
    const body = response.body as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.details?.length).toBe(1);
    expect(body.error.details?.[0]?.field).toBe('nome');
  });

  it('parses JSON before validating the id', async () => {
    const response = await request(app)
      .patch('/contatos/abc')
      .set('Content-Type', 'application/json')
      .send('{"nome":');

    expect(response.status).toBe(400);
    expect((response.body as ErrorBody).error.code).toBe('INVALID_JSON');
  });

  it('returns 413 when the payload exceeds 10kb', async () => {
    const contact = await createContact();

    const response = await request(app)
      .patch(`/contatos/${String(contact.id)}`)
      .send({ nome: 'João Silva', telefone: '11987654321', filler: 'x'.repeat(11000) });

    expect(response.status).toBe(413);
    expect((response.body as ErrorBody).error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('unsupported contact routes', () => {
  it('returns 404 ROUTE_NOT_FOUND for GET /contatos/:id', async () => {
    const contact = await createContact();

    const response = await request(app).get(`/contatos/${String(contact.id)}`);

    expect(response.status).toBe(404);
    expect((response.body as ErrorBody).error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('returns 404 ROUTE_NOT_FOUND for PUT /contatos', async () => {
    const response = await request(app).put('/contatos').send({ nome: 'João Silva' });

    expect(response.status).toBe(404);
    expect((response.body as ErrorBody).error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('returns 404 ROUTE_NOT_FOUND for an unknown path', async () => {
    const response = await request(app).get('/desconhecido');

    expect(response.status).toBe(404);
    expect((response.body as ErrorBody).error.code).toBe('ROUTE_NOT_FOUND');
  });
});
