# PRD — Contacts API

## 1. Overview
REST API to manage a contact list. Each contact has a name and a phone number.
Built with Node.js, Express and MySQL, running locally.
Technical assessment targeting junior-to-mid level.

## 2. Goals
- Implement create, list, update and delete operations for contacts.
- Enforce input validation exactly as specified, plus sensible phone validation.
- Deliver clean, consistent, testable code with zero code comments.
- Let an evaluator clone, configure, run and test the project in under 5 minutes.
- Provide interactive API documentation so routes can be tested from the browser.

## 3. Non-Goals
- Authentication, authorization, pagination, search, filtering, sorting options.
- `GET /contatos/:id` (not required, do not implement).
- Phone uniqueness (not required, see section 9).
- Frontend application of any kind (Swagger UI covers manual testing).
- CORS, deployment, cloud infrastructure.

## 4. Tech Stack
| Concern | Choice |
|---|---|
| Runtime | Node.js 22 LTS (`.nvmrc` = `22`, `engines.node` = `>=22`) |
| Language | TypeScript (strict), ESM |
| Dev runner | `tsx` (no build step in development) |
| Framework | Express 5 |
| Database | MySQL 8.4 via `mysql2/promise` (connection pool) |
| Validation | Zod 4 |
| Env | `dotenv` + Zod validation at startup |
| Logging | `pino` (`pino-pretty` in development only) |
| Security headers | `helmet` |
| API docs | `swagger-ui-express` + static `docs/openapi.yaml` parsed with `yaml` |
| Testing | Vitest + Supertest |
| Lint / Format | ESLint (flat config) + typescript-eslint + Prettier |
| Git hooks | Husky + lint-staged + commitlint (Conventional Commits) |
| Local DB | Docker Compose (MySQL 8.4) or manual MySQL install |
| CI | GitHub Actions (format, lint, comment check, typecheck, build, tests with MySQL) |

## 5. Data Model
File: `database/migrations/001_create_contacts_table.sql`

```sql
CREATE TABLE IF NOT EXISTS contacts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(11) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- `utf8mb4` is mandatory for accented names ("José Conceição").
- No unique constraint on `phone` (section 9).
- Timestamps exist for data hygiene only; they are not exposed by the API.

## 6. API Contract
Base URL: `http://localhost:3000`

The public contract keeps the Portuguese names defined in the assessment.
Internal code is English. Translation happens only in `contact.mapper.ts`.

Contact representation:
```json
{ "id": 1, "nome": "João Silva", "telefone": "11987654321" }
```

### 6.1 POST /contatos
- Body: `{ "nome": "string", "telefone": "string" }`, both required.
- 201: created contact.
- 400: `VALIDATION_ERROR` or `INVALID_JSON`.
- 413: `PAYLOAD_TOO_LARGE`.

### 6.2 GET /contatos
- 200: array of contacts ordered by `id ASC`. Empty array when none.

### 6.3 PATCH /contatos/:id
- Partial update. Body accepts `nome` and/or `telefone`; at least one is required.
- Each provided field follows the same rules as POST (section 7).
- Evaluation order: id validation → body validation → existence check.
- 200: full updated contact.
- 400: invalid id, empty body, unknown fields, validation error or malformed JSON.
- 404: `CONTACT_NOT_FOUND`.

### 6.4 DELETE /contatos/:id
- 204: empty body.
- 400: invalid id.
- 404: `CONTACT_NOT_FOUND`.

### 6.5 GET /docs
- Serves Swagger UI built from `docs/openapi.yaml`.
- `/docs` redirects to `/docs/`, which returns 200 with HTML.
- Not part of the assessment contract; tooling for evaluators.

### 6.6 Fallbacks
- Unknown route: 404 `ROUTE_NOT_FOUND`.
- Body over 10kb: 413 `PAYLOAD_TOO_LARGE`.
- Unhandled error: 500 `INTERNAL_ERROR`, generic message, no stack trace or internal detail.

## 7. Validation Rules
Schemas validate the public contract (`nome`, `telefone`). The mapper converts to the domain after validation.

### 7.1 Name (`nome`)
1. Required, must be a string.
2. Normalize Unicode to NFC.
3. Trim and collapse consecutive whitespace into one space.
4. Max 100 characters after normalization.
5. Must match `^\p{L}{3,}(?: \p{L}{3,})+$` with the `u` flag: at least 2 words, every word only letters (accents allowed), each with at least 3 letters.
- Valid: "João Silva", "Ana Paula Souza", "  José   Conceição  " (stored as "José Conceição").
- Invalid: "João", "Jo Silva", "Maria da Silva", "João Silva2", "Ana-Maria Silva", "D'Ávila Santos", "".

### 7.2 Phone (`telefone`)
1. Required, must be a string.
2. Allowed characters: digits, spaces, parentheses and hyphens (`^[\d\s()-]+$`).
3. Normalize: strip every non-digit character.
4. Result must match `^[1-9]\d{9,10}$` (10 or 11 digits, area code cannot start with 0).
5. Stored and returned as digits only.
- Valid: "(11) 98765-4321", "11 3456-7890", "1134567890".
- Invalid: "12345", "abc", "11a987654321", "+55 11 98765-4321", "(01) 98765-4321".

### 7.3 Id (path param)
- Must match `^[1-9]\d*$` and be ≤ 4294967295 (`INT UNSIGNED` max). Otherwise 400.

### 7.4 Body
- Strict object: unknown fields are rejected.
- Missing body or non-JSON content type (Express 5 sets `req.body` to `undefined`) → 400 `VALIDATION_ERROR`.
- PATCH requires at least one field.
- JSON limit: 10kb.

## 8. Error Contract
Every error response uses one shape:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [{ "field": "nome", "message": "Name must have at least two words with three letters each" }]
  }
}
```

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Invalid body or id |
| `INVALID_JSON` | 400 | Malformed JSON body |
| `CONTACT_NOT_FOUND` | 404 | Id does not exist |
| `ROUTE_NOT_FOUND` | 404 | Unknown route |
| `PAYLOAD_TOO_LARGE` | 413 | Body exceeds 10kb |
| `INTERNAL_ERROR` | 500 | Any unhandled error |

- `details` appears only on `VALIDATION_ERROR`.
- `details[].field` uses the public names (`nome`, `telefone`, `id`).
- Body-level issues use `field: "body"`; an unknown key is reported by its own name.
- All messages are in English.

## 9. Design Decisions (must be copied to README)
| Spec issue | Decision | Rationale |
|---|---|---|
| DELETE asks for "success message" with 204 | 204 with empty body | RFC 9110 forbids content in 204; Express strips the body of 204 responses anyway. Covered by a test. |
| PATCH param described as "to be deleted" | Treated as a copy error | Route semantics are update |
| Phone has no rule | Allowed chars + 10–11 digits, area code not starting with 0, stored as digits | Brazilian format, consistent storage |
| Phone uniqueness | Not enforced | Not in spec; shared landlines are legitimate |
| "Each word ≥ 3 letters" | Applied literally to every word | Strict spec compliance; "Maria da Silva" is rejected |
| Hyphens and apostrophes in names | Rejected | Spec says "letters" |
| PATCH semantics | Partial, at least one field, same rules as POST | HTTP PATCH semantics; covers the spec example |
| `.env` file | Not versioned; `.env.example` works as-is with Docker | Security; setup is `cp .env.example .env` |
| TypeScript | Used | Runs on Node.js; type safety; `npm run dev` needs no build |
| Portuguese API, English code | Translation in the mapper | Keeps the contract and clean internal naming |
| API documentation | Static OpenAPI file served by Swagger UI at `/docs` | `swagger-jsdoc` requires JSDoc comments, which the spec forbids |
| Frontend | Not built | Out of scope; Swagger UI, Postman and `requests.http` cover manual testing |

## 10. Non-Functional Requirements
- All SQL uses parameterized queries.
- Env vars validated at boot; the app fails fast with a clear message.
- Graceful shutdown on SIGINT/SIGTERM closes the HTTP server and the DB pool.
- No secrets committed.
- No personal data (names, phones, request bodies) in logs.
- Works on Windows, macOS and Linux; LF line endings enforced via `.gitattributes`.
- `/docs` works both in development (`npm run dev`) and from the build (`npm start`).
- `docs/openapi.yaml` always matches the real API behavior.
- `npm run lint`, `npm run typecheck` and `npm test` pass with zero warnings.

## 11. Local Environment

### 11.1 Env files
| File | Versioned | Purpose |
|---|---|---|
| `.env.example` | Yes | Template; values work with `docker compose` out of the box |
| `.env` | No | Local copy used by the app and by Docker Compose |
| `.env.test` | Yes | Test database config, no secrets (`DB_NAME=contacts_test`, `LOG_LEVEL=silent`) |

Variables: `NODE_ENV`, `PORT`, `LOG_LEVEL`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_ROOT_PASSWORD` (Docker only).

### 11.2 Docker
- `docker-compose.yml` runs MySQL 8.4 with a healthcheck and a named volume.
- `docker/mysql/init/01-create-test-database.sh` creates `<DB_NAME>_test` and grants access to `DB_USER`.
- Init scripts run only when the volume is first created; reset with `docker compose down -v`.

### 11.3 Manual MySQL
README must provide:
```sql
CREATE DATABASE contacts CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE contacts_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'contacts'@'%' IDENTIFIED BY 'contacts';
GRANT ALL PRIVILEGES ON contacts.* TO 'contacts'@'%';
GRANT ALL PRIVILEGES ON contacts_test.* TO 'contacts'@'%';
```

### 11.4 Migrations
- `npm run db:migrate` executes every file in `database/migrations/` in filename order.
- Migrations are idempotent (`IF NOT EXISTS`).
- Integration tests apply migrations to the test database automatically (Vitest `globalSetup`).

## 12. Manual Testing Tools
Evaluators can test the API in three ways, all documented in the README:

| Tool | File | Usage |
|---|---|---|
| Swagger UI | `docs/openapi.yaml` | Open `http://localhost:3000/docs`, use "Try it out" |
| Postman / Insomnia | `docs/contacts-api.postman_collection.json` | Import the collection |
| VS Code REST Client | `requests.http` | Click "Send Request" above each request |

Both collections cover the same cases, in this order:

| # | Request | Expected |
|---|---|---|
| 1 | POST valid contact (`"João Silva"`, `"(11) 98765-4321"`) | 201, `telefone` = `11987654321` |
| 2 | POST single-word name (`"João"`) | 400 |
| 3 | POST short middle word (`"Maria da Silva"`) | 400 |
| 4 | POST invalid phone (`"12345"`) | 400 |
| 5 | POST unknown field | 400 |
| 6 | POST malformed JSON | 400 `INVALID_JSON` |
| 7 | GET all contacts | 200 |
| 8 | PATCH only `nome` on created contact | 200 |
| 9 | PATCH only `telefone` on created contact | 200 |
| 10 | PATCH empty body `{}` | 400 |
| 11 | PATCH invalid id (`abc`) | 400 |
| 12 | PATCH non-existent id (`999999`) | 404 |
| 13 | DELETE created contact | 204, empty body |
| 14 | DELETE same contact again | 404 |
| 15 | DELETE invalid id (`0`) | 400 |

- The created contact id is captured automatically from request 1 (Postman: collection variable `contactId` set by a test script; REST Client: named request `createContact`).
- Base URL is a variable (`baseUrl` / `@baseUrl`) defaulting to `http://localhost:3000`.

## 13. Acceptance Criteria
- [ ] All endpoints behave exactly as section 6.
- [ ] Every case in section 7 is covered by tests.
- [ ] DELETE test asserts an empty body.
- [ ] `GET /docs/` returns 200 HTML, in dev and from the build.
- [ ] Every case in section 12 returns the expected status via Swagger UI, Postman and `requests.http`.
- [ ] Fresh clone + README steps = running API and passing tests.
- [ ] Zero comments in source code.
- [ ] CI is green.
- [ ] Commit history follows Conventional Commits and tells the story of the build.

## 14. Deliverables
- Git repository on GitHub with a one-line description in "About".
- `README.md` in this order:
  1. Requirements (Node 22+, npm, Docker or MySQL 8)
  2. Quick start with Docker (max 5 commands, starting with `cp .env.example .env`)
  3. Manual MySQL setup (section 11.3)
  4. Environment variables table
  5. Running (dev, build, start)
  6. Automated tests (unit, integration, coverage)
  7. Testing the API manually: Swagger UI at `http://localhost:3000/docs` first, then Postman, `requests.http` and `curl` examples with sample responses
  8. Design decisions (section 9)
  9. Available scripts
  10. Troubleshooting (port 3306 in use → change `DB_PORT`; reset DB → `docker compose down -v`; blank `/docs` → confirm the server is running and open `/docs/`)
- `.env.example`, `.env.test`, `docker-compose.yml`, init script, SQL migration.
- `docs/openapi.yaml`, `docs/contacts-api.postman_collection.json`, `requests.http`.
- `.github/workflows/ci.yml`.

## 15. Delivery Process
1. Confirm the required format in the assessment email (GitHub link, zip, private repository).
2. GitHub link: public repository, `main` up to date, CI green on the last commit.
3. Zip: generate with `git archive -o contacts-api.zip HEAD` (only versioned files; no `node_modules`, `dist`, `coverage`, `.env`).
4. Private repository: add the evaluator as collaborator.
5. Tag the delivered version: `git tag v1.0.0 && git push --tags`.
6. Run the fresh-clone verification (AGENT delivery checklist) before sending.
7. Reply in the original assessment email thread, mentioning the repository link, the stack summary, the design decisions section and the `/docs` URL.
8. Deliver with margin before the deadline. After delivery, do not push to `main`; report any bug found by email instead.

## 16. Timeline (3 days)
- Day 1: tooling, env, Docker, DB connection, migration, app bootstrap, error handling.
- Day 2: schemas, repository, POST, GET, PATCH, DELETE with integration tests.
- Day 3: service unit tests, OpenAPI + Swagger UI, collections, CI, README, fresh-clone verification, delivery.
