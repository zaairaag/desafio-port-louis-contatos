import { describe, expect, it } from 'vitest';
import {
  contactIdSchema,
  createContactSchema,
  nameSchema,
  phoneSchema,
  updateContactSchema,
} from '../../src/modules/contacts/contact.schemas.js';

const INVALID_NAMES = [
  'João',
  'Jo Silva',
  'Maria da Silva',
  'João Silva2',
  'Ana-Maria Silva',
  "D'Ávila Santos",
  '',
];

const INVALID_PHONES = [
  '12345',
  'abc',
  '11a987654321',
  '+55 11 98765-4321',
  '(01) 98765-4321',
  '(11) 9876-543',
  '119876543210',
  '',
];

const INVALID_IDS = ['0', '-1', '01', '1.0', '1e2', '+1', ' 1', '1 ', '1abc', 'abc', '4294967296'];

describe('nameSchema', () => {
  it.each(['João Silva', 'Ana Paula Souza'])('accepts %s without changing it', (name) => {
    expect(nameSchema.parse(name)).toBe(name);
  });

  it('normalizes unicode, edge whitespace and repeated spaces', () => {
    expect(nameSchema.parse('  José   Conceição  ')).toBe('José Conceição');
    expect(nameSchema.parse('  João\tSilva\n')).toBe('João Silva');
    expect(nameSchema.parse('Jose\u0301 Conceic\u0327a\u0303o')).toBe('José Conceição');
  });

  it.each(INVALID_NAMES)('rejects %j', (name) => {
    expect(nameSchema.safeParse(name).success).toBe(false);
  });

  it('accepts exactly one hundred characters and rejects one hundred and one', () => {
    const accepted = 'A'.repeat(48) + ' ' + 'B'.repeat(51);
    const rejected = 'A'.repeat(49) + ' ' + 'B'.repeat(51);

    expect(nameSchema.parse(accepted)).toHaveLength(100);
    expect(nameSchema.safeParse(rejected).success).toBe(false);
  });

  it('measures the limit after unicode normalization', () => {
    const accepted = 'A\u0301'.repeat(48) + ' ' + 'B'.repeat(51);

    expect(nameSchema.parse(accepted)).toHaveLength(100);
  });

  it('counts utf-16 code units at the limit', () => {
    const accepted = '𐐀'.repeat(25) + ' ' + 'B'.repeat(49);
    const rejected = '𐐀'.repeat(25) + ' ' + 'B'.repeat(50);

    expect(nameSchema.parse(accepted)).toHaveLength(100);
    expect(nameSchema.safeParse(rejected).success).toBe(false);
  });

  it.each([undefined, null, 42, true, [], {}])('rejects non-string input %j', (value) => {
    expect(nameSchema.safeParse(value).success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it.each([
    ['(11) 98765-4321', '11987654321'],
    ['11 3456-7890', '1134567890'],
    ['1134567890', '1134567890'],
    ['(11) 3 456-7890', '1134567890'],
  ])('normalizes %j to %j', (phone, expected) => {
    expect(phoneSchema.parse(phone)).toBe(expected);
  });

  it.each(INVALID_PHONES)('rejects %j', (phone) => {
    expect(phoneSchema.safeParse(phone).success).toBe(false);
  });

  it.each([undefined, null, 11987654321, true, [], {}])('rejects non-string input %j', (value) => {
    expect(phoneSchema.safeParse(value).success).toBe(false);
  });
});

describe('contactIdSchema', () => {
  it.each([
    ['1', 1],
    ['4294967295', 4294967295],
  ])('accepts %j', (id, expected) => {
    expect(contactIdSchema.parse(id)).toBe(expected);
  });

  it.each(INVALID_IDS)('rejects %j', (id) => {
    expect(contactIdSchema.safeParse(id).success).toBe(false);
  });
});

describe('createContactSchema', () => {
  it('normalizes both fields', () => {
    expect(
      createContactSchema.parse({ nome: '  João   Silva ', telefone: '(11) 98765-4321' }),
    ).toEqual({ nome: 'João Silva', telefone: '11987654321' });
  });

  it.each([{}, { nome: 'João Silva' }, { telefone: '11987654321' }])(
    'rejects an incomplete object %j',
    (body) => {
      expect(createContactSchema.safeParse(body).success).toBe(false);
    },
  );

  it.each([
    { nome: 'João Silva', telefone: '11987654321', email: 'joao@example.com' },
    { nome: 'João Silva', telefone: '11987654321', name: 'João Silva' },
    { nome: 'João Silva', telefone: '11987654321', phone: '11987654321' },
  ])('rejects unknown fields %j', (body) => {
    expect(createContactSchema.safeParse(body).success).toBe(false);
  });

  it.each([undefined, null, [], 'João Silva', 1, true])('rejects non-object input %j', (value) => {
    expect(createContactSchema.safeParse(value).success).toBe(false);
  });
});

describe('updateContactSchema', () => {
  it.each([
    { nome: 'João Silva' },
    { telefone: '11987654321' },
    { nome: 'João Silva', telefone: '11987654321' },
  ])('accepts a partial object %j', (body) => {
    expect(updateContactSchema.safeParse(body).success).toBe(true);
  });

  it('normalizes provided fields only', () => {
    expect(updateContactSchema.parse({ nome: '  João   Silva ' })).toEqual({ nome: 'João Silva' });
  });

  it.each([{}, { email: 'joao@example.com' }, { nome: 'João' }, { telefone: '12345' }])(
    'rejects %j',
    (body) => {
      expect(updateContactSchema.safeParse(body).success).toBe(false);
    },
  );

  it.each([undefined, null, [], 'João Silva', 1, true])('rejects non-object input %j', (value) => {
    expect(updateContactSchema.safeParse(value).success).toBe(false);
  });
});
