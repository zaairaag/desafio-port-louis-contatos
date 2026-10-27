import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import type { ContactBody, ErrorBody } from '../helpers/contracts.js';
import '../setup/integration-hooks.js';

const app = createApp();

const VALID_CONTACT = { nome: 'João Silva', telefone: '(11) 98765-4321' };

function buildBodyAtByteLimit(): string {
  const base = JSON.stringify(VALID_CONTACT);
  const paddingLength = 10240 - Buffer.byteLength(base);
  return JSON.stringify({
    nome: ' '.repeat(paddingLength) + VALID_CONTACT.nome,
    telefone: VALID_CONTACT.telefone,
  });
}

describe('POST /contatos', () => {
  it('creates a normalized contact and returns 201', async () => {
    const response = await request(app)
      .post('/contatos')
      .send({ nome: '  José   Conceição  ', telefone: '(11) 98765-4321' });
    const body = response.body as ContactBody;

    expect(response.status).toBe(201);
    expect(body.nome).toBe('José Conceição');
    expect(body.telefone).toBe('11987654321');
    expect(Number.isInteger(body.id)).toBe(true);

    const list = await request(app).get('/contatos');
    expect(list.body).toEqual([body]);
  });

  it('accepts duplicated phone numbers', async () => {
    const first = await request(app).post('/contatos').send(VALID_CONTACT);
    const second = await request(app).post('/contatos').send({
      nome: 'Ana Paula Souza',
      telefone: VALID_CONTACT.telefone,
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect((first.body as ContactBody).id).not.toBe((second.body as ContactBody).id);
  });

  it.each([
    { nome: 'João', telefone: '11987654321' },
    { nome: 'Maria da Silva', telefone: '11987654321' },
    { nome: 'João Silva', telefone: '12345' },
    { nome: 'João Silva', telefone: '+55 11 98765-4321' },
    { nome: 42, telefone: '11987654321' },
    { nome: 'João Silva', telefone: 11987654321 },
  ])('rejects invalid input %j with 400', async (payload) => {
    const response = await request(app).post('/contatos').send(payload);
    const body = response.body as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details?.length).toBeGreaterThan(0);
    expect(body.error.details?.[0]?.field).toBeTypeOf('string');

    const list = await request(app).get('/contatos');
    expect(list.body).toEqual([]);
  });

  it('rejects unknown fields with 400', async () => {
    const response = await request(app)
      .post('/contatos')
      .send({ ...VALID_CONTACT, email: 'joao@example.com' });

    expect(response.status).toBe(400);
    expect((response.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when the body is missing', async () => {
    const response = await request(app).post('/contatos');

    expect(response.status).toBe(400);
    expect((response.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when the content type is not JSON', async () => {
    const response = await request(app)
      .post('/contatos')
      .set('Content-Type', 'text/plain')
      .send('nome=João Silva&telefone=11987654321');

    expect(response.status).toBe(400);
    expect((response.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when the JSON root is an array', async () => {
    const response = await request(app)
      .post('/contatos')
      .set('Content-Type', 'application/json')
      .send([VALID_CONTACT]);

    expect(response.status).toBe(400);
    expect((response.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 INVALID_JSON for malformed JSON', async () => {
    const response = await request(app)
      .post('/contatos')
      .set('Content-Type', 'application/json')
      .send('{"nome":');
    const body = response.body as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_JSON');
    expect(body.error.message).toBeTypeOf('string');
    expect(body.error.details).toBeUndefined();
  });

  it('returns 400 INVALID_JSON for a JSON primitive', async () => {
    const response = await request(app)
      .post('/contatos')
      .set('Content-Type', 'application/json')
      .send('"João Silva"');

    expect(response.status).toBe(400);
    expect((response.body as ErrorBody).error.code).toBe('INVALID_JSON');
  });

  it('returns 413 when the payload exceeds 10kb', async () => {
    const response = await request(app)
      .post('/contatos')
      .send({ ...VALID_CONTACT, filler: 'x'.repeat(11000) });
    const body = response.body as ErrorBody;

    expect(response.status).toBe(413);
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(body.error.message).toBeTypeOf('string');
  });

  it('accepts a payload of exactly 10240 bytes', async () => {
    const payload = buildBodyAtByteLimit();
    expect(Buffer.byteLength(payload)).toBe(10240);

    const response = await request(app)
      .post('/contatos')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(response.status).toBe(201);
    expect((response.body as ContactBody).nome).toBe('João Silva');
  });
});
