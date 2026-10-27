export type Contact = {
  id: number;
  name: string;
  phone: string;
};

export type CreateContactInput = {
  name: string;
  phone: string;
};

export type UpdateContactInput = {
  name?: string;
  phone?: string;
};

export type ContactRow = {
  id: number;
  name: string;
  phone: string;
};

export type ContactResponse = {
  id: number;
  nome: string;
  telefone: string;
};

export type ContactRouteLocals = {
  contactId: number;
};

export interface ContactRepository {
  create(input: CreateContactInput): Promise<Contact>;
  findAll(): Promise<Contact[]>;
  findById(id: number): Promise<Contact | null>;
  update(id: number, input: UpdateContactInput): Promise<void>;
  delete(id: number): Promise<void>;
}
