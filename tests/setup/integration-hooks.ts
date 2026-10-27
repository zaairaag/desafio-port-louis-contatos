import { afterAll, beforeEach } from 'vitest';
import { closeDatabase, resetContacts } from '../helpers/database.js';

beforeEach(resetContacts);

afterAll(closeDatabase);
