import { describe, expect, it } from 'vitest';
import { toLoggedError } from '../../src/shared/errors/error-log.js';

describe('toLoggedError', () => {
  it('keeps only the error name, message and stack', () => {
    const error = Object.assign(new Error('Insert failed'), {
      sql: 'INSERT INTO contacts (name, phone) VALUES (?, ?)',
      values: ['João Silva', '11987654321'],
    });

    const logged = toLoggedError(error);

    expect(logged.name).toBe('Error');
    expect(logged.message).toBe('Insert failed');
    expect(logged.stack).toBeTypeOf('string');
    expect(Object.keys(logged)).toEqual(['name', 'message', 'stack']);
  });

  it('does not expose driver payloads from logged errors', () => {
    const error = Object.assign(new Error('Query failed'), {
      sql: 'SELECT password FROM users',
      values: ['11987654321'],
    });

    expect(JSON.stringify(toLoggedError(error))).not.toContain('SELECT');
    expect(JSON.stringify(toLoggedError(error))).not.toContain('11987654321');
  });

  it('describes a thrown non-error value without inspecting it', () => {
    expect(toLoggedError({ secret: '11987654321' })).toEqual({
      name: 'UnknownError',
      message: 'A non-error value was thrown',
    });
  });
});
