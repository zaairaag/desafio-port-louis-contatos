export type ContactBody = {
  id: number;
  nome: string;
  telefone: string;
};

export type ErrorDetail = {
  field: string;
  message: string;
};

export type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
};
