import { z } from 'zod';

export const NAME_MIN_WORDS = 2;
export const NAME_MIN_WORD_LENGTH = 3;
export const NAME_MAX_LENGTH = 100;
export const NAME_PATTERN = /^\p{L}{3,}(?: \p{L}{3,})+$/u;
export const PHONE_ALLOWED_CHARACTERS = /^[\d\s()-]+$/;
export const PHONE_PATTERN = /^[1-9]\d{9,10}$/;
export const ID_MAX_VALUE = 4294967295;
export const ID_PATTERN = /^[1-9]\d*$/;

const normalizeName = (value: string): string => value.normalize('NFC').trim().replace(/\s+/g, ' ');

const stripNonDigits = (value: string): string => value.replace(/\D/g, '');

export const nameSchema = z
  .string({ error: 'Name is required and must be a string' })
  .transform(normalizeName)
  .refine((value) => value.length > 0, 'Name is required')
  .refine(
    (value) => value.length <= NAME_MAX_LENGTH,
    `Name must have at most ${String(NAME_MAX_LENGTH)} characters`,
  )
  .refine(
    (value) => NAME_PATTERN.test(value),
    `Name must have at least ${String(NAME_MIN_WORDS)} words with ${String(NAME_MIN_WORD_LENGTH)} letters each`,
  );

export const phoneSchema = z
  .string({ error: 'Phone is required and must be a string' })
  .regex(PHONE_ALLOWED_CHARACTERS, 'Phone must contain only digits, spaces, parentheses or hyphens')
  .transform(stripNonDigits)
  .refine(
    (value) => PHONE_PATTERN.test(value),
    'Phone must have 10 or 11 digits and an area code not starting with 0',
  );

export const contactIdSchema = z
  .string({ error: 'Id is required and must be a string' })
  .regex(ID_PATTERN, 'Id must be a positive integer')
  .transform(Number)
  .refine((value) => Number.isInteger(value) && value <= ID_MAX_VALUE, 'Id is out of range');

export const createContactSchema = z.strictObject({
  nome: nameSchema,
  telefone: phoneSchema,
});

export const updateContactSchema = z
  .strictObject({
    nome: nameSchema.optional(),
    telefone: phoneSchema.optional(),
  })
  .refine(
    (value) => value.nome !== undefined || value.telefone !== undefined,
    'At least one of nome or telefone is required',
  );

export type CreateContactDto = z.output<typeof createContactSchema>;
export type UpdateContactDto = z.output<typeof updateContactSchema>;
