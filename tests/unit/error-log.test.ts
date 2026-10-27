import { describe, expect, it } from 'vitest';
import { toLoggedError } from '../../src/shared/errors/error-log.js';

describe('toLoggedError', () => {
  it.each(['message', 'stack', 'name'] as const)(
    'does not expose personal data embedded in the error %s',
    (field) => {
      const privateData = 'João Silva 11987654321';
      const error = Object.assign(new Error('Persistence failed'), { [field]: privateData });

      expect(JSON.stringify(toLoggedError(error))).not.toContain(privateData);
    },
  );

  it('does not expose driver payloads from logged errors', () => {
    const error = Object.assign(new Error('Query failed'), {
      sql: 'SELECT password FROM users',
      values: ['11987654321'],
    });

    expect(JSON.stringify(toLoggedError(error))).not.toContain('SELECT');
    expect(JSON.stringify(toLoggedError(error))).not.toContain('11987654321');
  });

  it.each([
    'João Silva 11987654321',
    { name: 'João Silva', phone: '11987654321' },
    ['João Silva', '11987654321'],
  ])('does not expose a thrown non-error value %j', (value) => {
    const serialized = JSON.stringify(toLoggedError(value));

    expect(serialized).not.toContain('João Silva');
    expect(serialized).not.toContain('11987654321');
  });
});
