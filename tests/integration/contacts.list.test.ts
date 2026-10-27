import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import type { ContactBody } from '../helpers/contracts.js';
import '../setup/integration-hooks.js';

const app = createApp();

const NAMES = ['João Silva', 'Ana Paula Souza', 'Maria Clara Nunes'];

async function createContact(name: string): Promise<ContactBody> {
  const response = await request(app)
    .post('/contatos')
    .send({ nome: name, telefone: '(11) 98765-4321' });
  return response.body as ContactBody;
}

describe('GET /contatos', () => {
  it('returns an empty array when there are no contacts', async () => {
    const response = await request(app).get('/contatos');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns every contact ordered by id', async () => {
    const created = [];
    for (const name of NAMES) {
      created.push(await createContact(name));
    }

    const response = await request(app).get('/contatos');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(created);
  });

  it('exposes only the public contact fields', async () => {
    await createContact('João Silva');

    const response = await request(app).get('/contatos');
    const [contact] = response.body as ContactBody[];
    const body = contact as ContactBody;

    expect(body.nome).toBe('João Silva');
    expect(body.telefone).toBe('11987654321');
    expect(Number.isInteger(body.id)).toBe(true);
    expect(Object.keys(body).toSorted()).toEqual(['id', 'nome', 'telefone']);
  });
});
