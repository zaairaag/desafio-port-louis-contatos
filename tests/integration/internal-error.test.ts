import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';

vi.mock('../../src/database/connection.js', () => ({
  pool: {
    execute: vi.fn().mockRejectedValue(new Error('Database unavailable')),
    query: vi.fn().mockRejectedValue(new Error('Database unavailable')),
  },
}));

const app = createApp();

describe('unexpected persistence failures', () => {
  it('returns a generic 500 without internal details', async () => {
    const response = await request(app)
      .post('/contatos')
      .send({ nome: 'João Silva', telefone: '11987654321' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' },
    });
    expect(response.text).not.toContain('Database unavailable');
    expect(response.text).not.toContain('stack');
  });

  it('returns 500 when an update lookup fails', async () => {
    const response = await request(app).patch('/contatos/1').send({ nome: 'João Silva' });

    expect(response.status).toBe(500);
    expect(response.text).not.toContain('Database unavailable');
  });
});
