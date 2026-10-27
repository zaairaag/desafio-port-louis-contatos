# Contacts API

API REST para gerenciar uma lista de contatos com nome e telefone, construída com Node.js, Express
e MySQL.

## 1. Requisitos

- Node.js 22 ou superior (`node --version`)
- npm
- Docker com Docker Compose, ou um servidor MySQL 8.4 local

## 2. Início rápido com Docker

```sh
cp .env.example .env
docker compose up -d
npm ci
npm run db:migrate
npm run dev
```

No Windows PowerShell, substitua o primeiro comando por `Copy-Item .env.example .env`.

Antes de migrar, confirme que o banco está saudável com `docker compose ps`. Na primeira
inicialização, o MySQL cria `contacts` e `contacts_test` e depois reinicia uma vez, então o
container pode aparecer como saudável por alguns segundos antes de o usuário da aplicação estar
pronto. O `npm ci` normalmente cobre essa janela. Se `npm run db:migrate` retornar
`Connection lost`, aguarde alguns segundos e execute novamente. O Docker cria os dois bancos na
primeira inicialização; o comando de reset do volume só é necessário quando você quer apagar os
dados.

Abra `http://localhost:3000/docs` e use **Try it out** para executar cada rota.

## 3. Configuração manual do MySQL

Se preferir uma instalação local do MySQL 8.4, execute:

```sql
CREATE DATABASE contacts CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE contacts_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'contacts'@'%' IDENTIFIED BY 'contacts';
GRANT ALL PRIVILEGES ON contacts.* TO 'contacts'@'%';
GRANT ALL PRIVILEGES ON contacts_test.* TO 'contacts'@'%';
```

Depois copie `.env.example` para `.env` e execute `npm run db:migrate`.

## 4. Variáveis de ambiente

| Variável           | Usada por      | Padrão        | Finalidade                                    |
| ------------------ | -------------- | ------------- | --------------------------------------------- |
| `NODE_ENV`         | Aplicação      | `development` | Modo de execução                              |
| `PORT`             | Aplicação      | `3000`        | Porta HTTP                                    |
| `LOG_LEVEL`        | Aplicação      | `info`        | Nível do Pino; os testes usam `silent`        |
| `DB_HOST`          | Aplicação      | `127.0.0.1`   | Host do MySQL                                 |
| `DB_PORT`          | Aplicação      | `3306`        | Porta do MySQL                                |
| `DB_USER`          | Aplicação      | `contacts`    | Usuário do MySQL                              |
| `DB_PASSWORD`      | Aplicação      | `contacts`    | Senha do MySQL                                |
| `DB_NAME`          | Aplicação      | `contacts`    | Banco de dados da aplicação                   |
| `DB_ROOT_PASSWORD` | Docker Compose | `root`        | Senha root usada para criar o banco de testes |

`.env` é local e ignorado pelo Git. `.env.example` e `.env.test` são versionados.

## 5. Execução

```sh
npm run dev
npm run build
npm start
```

`npm run dev` usa `tsx watch`. `npm run build` compila `src` para `dist`. `npm start` executa o
servidor compilado. `/docs` funciona nos dois modos.

Os logs de erro omitem nomes, mensagens, stacks e payloads de driver das exceções, porque eles podem
conter dados de contatos. A mensagem de log ao redor identifica a operação que falhou sem expor
nomes, telefones ou SQL.

## 6. Testes automatizados

```sh
npm run test:unit
npm run test:integration
npm test
npm run test:coverage
```

Os testes unitários não precisam de MySQL. Os testes de integração precisam de um MySQL em execução
com `contacts_test` e aplicam as migrações automaticamente. Os arquivos de integração rodam
sequencialmente e truncam a tabela de contatos antes de cada teste. Execute `docker compose up -d`
antes quando usar Docker.

Os testes reaproveitam o `DB_PORT` do `.env` local quando ele existe, mantendo a mesma porta
publicada do Docker. Sem `.env`, eles usam `.env.test`, incluindo a porta `3306` no CI. O nome do
banco e as demais configurações de teste continuam vindo de `.env.test`.

## 7. Testando a API manualmente

### Swagger UI

Inicie o servidor e abra `http://localhost:3000/docs`. Expanda uma operação, escolha **Try it out**,
edite o payload e execute.

### Postman ou Insomnia

Importe `docs/contacts-api.postman_collection.json`. A coleção usa a variável `baseUrl` e armazena o
id criado em `contactId` automaticamente. Execute as requisições na ordem.

### VS Code REST Client

Abra `requests.http` e clique em **Send Request** acima de cada bloco. A requisição nomeada
`createContact` fornece o id para as requisições de atualização e exclusão.

### curl

Criar um contato:

```sh
curl -X POST http://localhost:3000/contatos \
  -H "Content-Type: application/json" \
  -d '{"nome":"João Silva","telefone":"(11) 98765-4321"}'
```

```json
{ "id": 1, "nome": "João Silva", "telefone": "11987654321" }
```

Nome inválido:

```sh
curl -X POST http://localhost:3000/contatos \
  -H "Content-Type: application/json" \
  -d '{"nome":"Maria da Silva","telefone":"11987654321"}'
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "nome",
        "message": "Name must have at least 2 words, letters only, with 3 letters each"
      }
    ]
  }
}
```

Listar contatos:

```sh
curl http://localhost:3000/contatos
```

```json
[{ "id": 1, "nome": "João Silva", "telefone": "11987654321" }]
```

Atualizar apenas o telefone:

```sh
curl -X PATCH http://localhost:3000/contatos/1 \
  -H "Content-Type: application/json" \
  -d '{"telefone":"11 3456-7890"}'
```

```json
{ "id": 1, "nome": "João Silva", "telefone": "1134567890" }
```

Excluir um contato:

```sh
curl -i -X DELETE http://localhost:3000/contatos/1
```

```http
HTTP/1.1 204 No Content
```

### Teste de fumaça ponta a ponta

```bash
bash scripts/test-api.sh http://localhost:3000
```

Executa 30 requisições cobrindo todos os códigos de status e imprime PASS/FAIL. Use Git Bash ou WSL
no Windows (UTF-8 é obrigatório).

## 8. Decisões de projeto

| Ponto da especificação                            | Decisão                                                                                   | Justificativa                                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| DELETE pede "mensagem de sucesso" com 204         | 204 com corpo vazio                                                                       | A RFC 9110 proíbe conteúdo em 204; o Express descarta o corpo de respostas 204 de qualquer forma. Coberto por teste. |
| Parâmetro do PATCH descrito como "a ser excluído" | Tratado como erro de cópia                                                                | A semântica da rota é atualização                                                                                    |
| Telefone sem regra                                | Caracteres permitidos + 10–11 dígitos, DDD não começando com 0, armazenado só com dígitos | Formato brasileiro, armazenamento consistente                                                                        |
| Unicidade de telefone                             | Não aplicada                                                                              | Não está na especificação; linhas fixas compartilhadas são legítimas                                                 |
| "Cada palavra ≥ 3 letras"                         | Aplicado literalmente a cada palavra                                                      | Aderência estrita à especificação; "Maria da Silva" é rejeitado                                                      |
| Hífens e apóstrofos em nomes                      | Rejeitados                                                                                | A especificação diz "letras"                                                                                         |
| Semântica do PATCH                                | Parcial, ao menos um campo, mesmas regras do POST                                         | Semântica HTTP de PATCH; cobre o exemplo da especificação                                                            |
| Arquivo `.env`                                    | Não versionado; `.env.example` funciona como está com o Docker                            | Segurança; a configuração é `cp .env.example .env`                                                                   |
| TypeScript                                        | Usado                                                                                     | Roda no Node.js; segurança de tipos; `npm run dev` não precisa de build                                              |
| API em português, código em inglês                | Tradução no mapper                                                                        | Mantém o contrato e a nomenclatura interna limpa                                                                     |
| Documentação da API                               | Arquivo OpenAPI estático servido pelo Swagger UI em `/docs`                               | O `swagger-jsdoc` exige comentários JSDoc, que a especificação proíbe                                                |
| Frontend                                          | Não construído                                                                            | Fora do escopo; Swagger UI, Postman e `requests.http` cobrem o teste manual                                          |

## 9. Scripts disponíveis

| Comando                    | Finalidade                                           |
| -------------------------- | ---------------------------------------------------- |
| `npm run dev`              | Inicia o servidor de desenvolvimento com `tsx watch` |
| `npm run build`            | Compila TypeScript para `dist`                       |
| `npm start`                | Executa o servidor compilado                         |
| `npm run lint`             | Executa o ESLint com zero avisos                     |
| `npm run lint:fix`         | Corrige problemas de lint                            |
| `npm run format`           | Formata com Prettier                                 |
| `npm run format:check`     | Verifica a formatação                                |
| `npm run typecheck`        | Checa tipos de `src` e `tests`                       |
| `npm test`                 | Executa testes unitários e de integração             |
| `npm run test:unit`        | Executa testes unitários sem MySQL                   |
| `npm run test:integration` | Executa testes de integração contra o MySQL          |
| `npm run test:coverage`    | Gera relatório de cobertura                          |
| `npm run db:migrate`       | Aplica migrações pendentes                           |
| `docker compose up -d`     | Inicia o MySQL                                       |
| `docker compose down -v`   | Para o MySQL e apaga os dados                        |

## 10. Solução de problemas

- **A porta 3306 já está em uso:** altere `DB_PORT` no `.env` para uma porta livre e execute
  `docker compose up -d`. Os testes reaproveitam essa porta local automaticamente.
- **Resetar o banco:** execute `docker compose down -v` e depois `docker compose up -d` seguido de
  `npm run db:migrate`. Isso apaga todos os dados locais.
- **`/docs` em branco:** confirme que o servidor está rodando e abra
  `http://localhost:3000/docs/` com a barra final. `/docs` redireciona para lá.
- **Testes de integração não conectam:** confirme que o MySQL está saudável, que `contacts_test`
  existe e que o `DB_PORT` do `.env` corresponde à porta publicada pelo Docker. Sem `.env`,
  verifique `.env.test`.
- **`Connection lost` na primeira migração:** o MySQL ainda está finalizando a inicialização do
  primeiro start. Aguarde alguns segundos e execute `npm run db:migrate` novamente.

## 11. Deploy em produção (opcional)

A stack de produção executa MySQL e API em Docker, publicando a API apenas em loopback. Um
Cloudflare Tunnel a expõe publicamente, sem porta de entrada nem proxy reverso compartilhado.

```sh
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm api node dist/database/migrate.js
```

O `docker-compose.prod.yml` lê `DB_ROOT_PASSWORD`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` do mesmo
`.env` usado pelo container da API. Mantenha esse arquivo com permissão `600`; ele nunca é
versionado. A API é servida em `http://127.0.0.1:3100` e o hostname do túnel aponta para esse
endereço.

O deploy de referência está disponível em `https://contatos.zairagoncalves.com`. A API não tem
autenticação por decisão de projeto e serve para demonstração, não para armazenar dados sensíveis.

Atualize a imagem após um novo commit com:

```sh
docker compose -f docker-compose.prod.yml up -d --build
```
