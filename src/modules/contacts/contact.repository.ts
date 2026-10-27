import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';
import { toContactFromRow } from './contact.mapper.js';
import type {
  Contact,
  ContactRepository,
  ContactRow,
  CreateContactInput,
  UpdateContactInput,
} from './contact.types.js';

const CONTACT_COLUMNS = 'id, name, phone';

type ContactRowPacket = RowDataPacket & ContactRow;

type UpdateStatement = {
  assignments: string;
  values: string[];
};

function buildUpdateStatement(input: UpdateContactInput): UpdateStatement {
  const assignments: string[] = [];
  const values: string[] = [];

  if (input.name !== undefined) {
    assignments.push('name = ?');
    values.push(input.name);
  }

  if (input.phone !== undefined) {
    assignments.push('phone = ?');
    values.push(input.phone);
  }

  return { assignments: assignments.join(', '), values };
}

export class MysqlContactRepository implements ContactRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateContactInput): Promise<Contact> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'INSERT INTO contacts (name, phone) VALUES (?, ?)',
      [input.name, input.phone],
    );
    return { id: result.insertId, name: input.name, phone: input.phone };
  }

  async findAll(): Promise<Contact[]> {
    const [rows] = await this.pool.query<ContactRowPacket[]>(
      `SELECT ${CONTACT_COLUMNS} FROM contacts ORDER BY id ASC`,
    );
    return rows.map(toContactFromRow);
  }

  async findById(id: number): Promise<Contact | null> {
    const [rows] = await this.pool.execute<ContactRowPacket[]>(
      `SELECT ${CONTACT_COLUMNS} FROM contacts WHERE id = ?`,
      [id],
    );
    const row = rows[0];
    return row === undefined ? null : toContactFromRow(row);
  }

  async update(id: number, input: UpdateContactInput): Promise<void> {
    const { assignments, values } = buildUpdateStatement(input);
    await this.pool.execute(`UPDATE contacts SET ${assignments} WHERE id = ?`, [...values, id]);
  }

  async delete(id: number): Promise<void> {
    await this.pool.execute('DELETE FROM contacts WHERE id = ?', [id]);
  }
}
