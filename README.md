# Contacts API

REST API to manage a contact list with name and phone, built with Node.js, Express and MySQL.

## 1. Requirements

- Node.js 22 or newer (`node --version`)
- npm
- Docker with Docker Compose, or a local MySQL 8.4 server

## 2. Quick start with Docker

```sh
cp .env.example .env
docker compose up -d
npm ci
npm run db:migrate
npm run dev
```

On Windows PowerShell, replace the first command with `Copy-Item .env.example .env`.

Before migrating, confirm the database is healthy with `docker compose ps`. On the very first
start, MySQL creates `contacts` and `contacts_test` and then restarts itself once, so the container
can report healthy for a few seconds before the application user is ready. `npm ci` normally covers
that window. If `npm run db:migrate` reports `Connection lost`, wait a few seconds and run it again.
Docker creates both databases on the first start; the volume reset command is only needed when you
want to wipe the data.

Open `http://localhost:3000/docs` and use **Try it out** to execute every route.

## 3. Manual MySQL setup

If you prefer a local MySQL 8.4 installation, run:

```sql
CREATE DATABASE contacts CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE contacts_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'contacts'@'%' IDENTIFIED BY 'contacts';
GRANT ALL PRIVILEGES ON contacts.* TO 'contacts'@'%';
GRANT ALL PRIVILEGES ON contacts_test.* TO 'contacts'@'%';
```

Then copy `.env.example` to `.env` and run `npm run db:migrate`.

## 4. Environment variables

| Variable           | Used by        | Default       | Purpose                                        |
| ------------------ | -------------- | ------------- | ---------------------------------------------- |
| `NODE_ENV`         | Application    | `development` | Runtime mode                                   |
| `PORT`             | Application    | `3000`        | HTTP port                                      |
| `LOG_LEVEL`        | Application    | `info`        | Pino level; tests use `silent`                 |
| `DB_HOST`          | Application    | `127.0.0.1`   | MySQL host                                     |
| `DB_PORT`          | Application    | `3306`        | MySQL port                                     |
| `DB_USER`          | Application    | `contacts`    | MySQL user                                     |
| `DB_PASSWORD`      | Application    | `contacts`    | MySQL password                                 |
| `DB_NAME`          | Application    | `contacts`    | Application database                           |
| `DB_ROOT_PASSWORD` | Docker Compose | `root`        | Root password used to create the test database |

`.env` is local and ignored by Git. `.env.example` and `.env.test` are versioned.

## 5. Running

```sh
npm run dev
npm run build
npm start
```

`npm run dev` uses `tsx watch`. `npm run build` compiles `src` to `dist`. `npm start` runs the
compiled server. `/docs` works in both modes.

Error logs omit exception names, messages, stacks and driver payloads because they can contain
contact data. The surrounding log message identifies the failed operation without exposing
names, phone numbers or SQL.

## 6. Automated tests

```sh
npm run test:unit
npm run test:integration
npm test
npm run test:coverage
```

Unit tests do not need MySQL. Integration tests need a running MySQL with `contacts_test` and apply
migrations automatically. Integration files run sequentially and truncate the contacts table before
each test. Run `docker compose up -d` first when using Docker.

Tests reuse `DB_PORT` from the local `.env` when it exists, keeping the same published MySQL
port as Docker. Without `.env`, they use `.env.test`, including port `3306` in CI. The database
name and other test settings still come from `.env.test`.

## 7. Testing the API manually

### Swagger UI

Start the server and open `http://localhost:3000/docs`. Expand an operation, choose **Try it out**,
edit the payload and execute it.

### Postman or Insomnia

Import `docs/contacts-api.postman_collection.json`. The collection uses the `baseUrl` variable and
stores the created id in `contactId` automatically. Run the requests in order.

### VS Code REST Client

Open `requests.http` and click **Send Request** above each block. The named request `createContact`
feeds the id of the update and delete requests.

### curl

Create a contact:

```sh
curl -X POST http://localhost:3000/contatos \
  -H "Content-Type: application/json" \
  -d '{"nome":"João Silva","telefone":"(11) 98765-4321"}'
```

```json
{ "id": 1, "nome": "João Silva", "telefone": "11987654321" }
```

Invalid name:

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
        "message": "Name must have at least 2 words with 3 letters each"
      }
    ]
  }
}
```

List contacts:

```sh
curl http://localhost:3000/contatos
```

```json
[{ "id": 1, "nome": "João Silva", "telefone": "11987654321" }]
```

Update only the phone:

```sh
curl -X PATCH http://localhost:3000/contatos/1 \
  -H "Content-Type: application/json" \
  -d '{"telefone":"11 3456-7890"}'
```

```json
{ "id": 1, "nome": "João Silva", "telefone": "1134567890" }
```

Delete a contact:

```sh
curl -i -X DELETE http://localhost:3000/contatos/1
```

```http
HTTP/1.1 204 No Content
```

## 8. Design decisions

| Spec issue                                 | Decision                                                                      | Rationale                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| DELETE asks for "success message" with 204 | 204 with empty body                                                           | RFC 9110 forbids content in 204; Express strips the body of 204 responses anyway. Covered by a test. |
| PATCH param described as "to be deleted"   | Treated as a copy error                                                       | Route semantics are update                                                                           |
| Phone has no rule                          | Allowed chars + 10–11 digits, area code not starting with 0, stored as digits | Brazilian format, consistent storage                                                                 |
| Phone uniqueness                           | Not enforced                                                                  | Not in spec; shared landlines are legitimate                                                         |
| "Each word ≥ 3 letters"                    | Applied literally to every word                                               | Strict spec compliance; "Maria da Silva" is rejected                                                 |
| Hyphens and apostrophes in names           | Rejected                                                                      | Spec says "letters"                                                                                  |
| PATCH semantics                            | Partial, at least one field, same rules as POST                               | HTTP PATCH semantics; covers the spec example                                                        |
| `.env` file                                | Not versioned; `.env.example` works as-is with Docker                         | Security; setup is `cp .env.example .env`                                                            |
| TypeScript                                 | Used                                                                          | Runs on Node.js; type safety; `npm run dev` needs no build                                           |
| Portuguese API, English code               | Translation in the mapper                                                     | Keeps the contract and clean internal naming                                                         |
| API documentation                          | Static OpenAPI file served by Swagger UI at `/docs`                           | `swagger-jsdoc` requires JSDoc comments, which the spec forbids                                      |
| Frontend                                   | Not built                                                                     | Out of scope; Swagger UI, Postman and `requests.http` cover manual testing                           |

## 9. Available scripts

| Command                    | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `npm run dev`              | Start the development server with `tsx watch` |
| `npm run build`            | Compile TypeScript to `dist`                  |
| `npm start`                | Run the compiled server                       |
| `npm run lint`             | Run ESLint with zero warnings                 |
| `npm run lint:fix`         | Fix lint issues                               |
| `npm run format`           | Format with Prettier                          |
| `npm run format:check`     | Check formatting                              |
| `npm run typecheck`        | Type-check `src` and `tests`                  |
| `npm test`                 | Run unit and integration tests                |
| `npm run test:unit`        | Run unit tests without MySQL                  |
| `npm run test:integration` | Run integration tests against MySQL           |
| `npm run test:coverage`    | Generate a coverage report                    |
| `npm run db:migrate`       | Apply pending migrations                      |
| `docker compose up -d`     | Start MySQL                                   |
| `docker compose down -v`   | Stop MySQL and delete its data                |

## 10. Troubleshooting

- **Port 3306 is already in use:** change `DB_PORT` in `.env` to a free port, then run
  `docker compose up -d`. Tests automatically reuse that local port.
- **Reset the database:** run `docker compose down -v` and then `docker compose up -d` followed by
  `npm run db:migrate`. This deletes all local data.
- **Blank `/docs`:** confirm the server is running and open `http://localhost:3000/docs/` with the
  trailing slash. `/docs` redirects there.
- **Integration tests cannot connect:** confirm MySQL is healthy, `contacts_test` exists, and
  `DB_PORT` in `.env` matches the published Docker port. Without `.env`, check `.env.test`.
- **`Connection lost` on the first migration:** MySQL is still finishing its first-start
  initialization. Wait a few seconds and run `npm run db:migrate` again.

## 11. Production deployment (optional)

The production stack runs MySQL and the API in Docker, publishing the API only on loopback. A
Cloudflare Tunnel exposes it publicly, so no inbound port or shared reverse proxy is required.

```sh
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm api node dist/database/migrate.js
```

`docker-compose.prod.yml` reads `DB_ROOT_PASSWORD`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` from the
same `.env` used by the API container. Keep that file mode `600`; it is never committed. The API is
served at `http://127.0.0.1:3100` and the tunnel hostname points to that address.

The reference deployment is available at `https://contatos.zairagoncalves.com`. The API is
unauthenticated by design and is intended for demonstration, not for storing sensitive data.

Update the image after a new commit with:

```sh
docker compose -f docker-compose.prod.yml up -d --build
```
