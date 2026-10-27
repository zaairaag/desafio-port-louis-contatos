# AGENT — Operating Instructions

## Mission
Build the Contacts API defined in `PRD.md`, following `RULES.md` with zero exceptions.
Target: junior-to-mid developer delivering production-grade, clean code.

## Read Order (mandatory before any code)
1. `PRD.md`: what to build. Source of truth for behavior.
2. `RULES.md`: how to build. Source of truth for standards.
3. This file: how to work.

If PRD and RULES conflict, stop and report. Do not guess.

## Operating Principles
- Follow the spec literally. Ambiguities are resolved in PRD section 9.
- No scope creep: no extra endpoints, fields, constraints, features or frontend.
- Simplest solution that satisfies PRD and RULES.
- Never write code comments. Express intent through names and small functions.
- Never bypass tooling (`--no-verify`, inline disables, `@ts-*` directives).
- When uncertain, check the PRD, then ask. Never invent behavior.
- Reference files in the appendix must be used exactly as written.

## Workflow per Task
1. State the task and the files you will touch.
2. Implement in the correct layer (RULES section 5).
3. Write or update tests for the behavior.
4. If behavior changed after docs exist, update `docs/openapi.yaml`, `requests.http` and the Postman collection.
5. Run `npm run lint && npm run typecheck && npm test`.
6. Fix until zero errors and zero warnings.
7. Commit with a Conventional Commit message.
8. Report: what changed, why, test results.

## Execution Plan
Each step is one or more atomic commits.

### Phase 1 — Foundation
1. `chore: initialize project` — `package.json` (`type: module`, `engines`), `.nvmrc`, `.gitignore`, `.gitattributes`, `.editorconfig`, `tsconfig.json`, `tsconfig.build.json`.
2. `build: configure eslint and prettier`
3. `build: configure husky, lint-staged and commitlint`
4. `build: configure vitest projects`
5. `chore: add docker compose for mysql` — compose file and test database init script.
6. `feat: add environment validation` — `config/env.ts`, `.env.example`, `.env.test`.

### Phase 2 — Infrastructure
7. `feat: add logger`
8. `feat: add mysql connection pool`
9. `feat: add contacts table migration` — SQL file and `db:migrate` script.
10. `feat: add app bootstrap and graceful shutdown` — `app.ts`, `server.ts`, helmet, JSON limit.
11. `feat: add centralized error handling` — `AppError` hierarchy, HTTP status constants, error handler, route fallback, body-parser errors.
12. `test: add integration test setup` — global setup, env loading, truncate helper.

### Phase 3 — Contacts Module
13. `feat: add contact schemas and validation middleware` + unit tests for every PRD section 7 case.
14. `feat: add contact repository and mapper`
15. `feat: add contact creation endpoint` + tests (201, 400 validation, 400 invalid JSON, 413).
16. `feat: add contact listing endpoint` + tests (200 with data, 200 empty array, ordering).
17. `feat: add contact update endpoint` + tests (200 partial and full, 400 id/body/empty/unknown field, 404).
18. `feat: add contact deletion endpoint` + tests (204 with empty body, 400, 404).

### Phase 4 — Documentation and Delivery
19. `test: add contact service unit tests`
20. `docs: add openapi spec and swagger ui` — `docs/openapi.yaml`, `src/shared/http/api-docs.ts`, mount in `app.ts` before helmet, integration test for `GET /docs/` (200, `text/html`). Verify `/docs` with `npm run dev` and with `npm run build && npm start`.
21. `docs: add http request collections` — `requests.http` and `docs/contacts-api.postman_collection.json`, cases exactly as PRD section 12.
22. `ci: add github actions workflow`
23. `docs: add readme` — order defined in PRD section 14.
24. Delivery checklist (below), then delivery process (PRD section 15).

## Commands
| Command | Purpose |
|---|---|
| `npm run dev` | `tsx watch src/server.ts` |
| `npm run build` | `tsc -p tsconfig.build.json` |
| `npm start` | `node dist/server.js` |
| `npm run lint` | `eslint . --max-warnings=0` |
| `npm run lint:fix` | ESLint autofix |
| `npm run format` | `prettier --write .` |
| `npm run format:check` | `prettier --check .` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | All tests (MySQL required) |
| `npm run test:unit` | `vitest run --project unit` (no MySQL) |
| `npm run test:integration` | `vitest run --project integration` |
| `npm run test:coverage` | Coverage report |
| `npm run db:migrate` | `tsx src/database/migrate.ts` |
| `docker compose up -d` | Start MySQL |
| `docker compose down -v` | Stop and wipe MySQL data |

## Definition of Done (task)
- Behavior matches the PRD, including status codes and error shape.
- Code in the correct layer.
- Success and failure paths tested.
- Docs and collections in sync with behavior.
- Lint, typecheck and tests pass with zero warnings.
- Zero comments.
- Valid Conventional Commit.

## Delivery Checklist (project)
- [ ] All PRD section 13 acceptance criteria checked.
- [ ] `git log --all -- .env` returns nothing.
- [ ] `grep -rnE "(^|\s)//|/\*" src tests` returns nothing.
- [ ] CI green on the last commit.
- [ ] Fresh clone in a new folder, README followed literally, no step skipped:
  - [ ] `cp .env.example .env`
  - [ ] `docker compose up -d` (wait for healthy)
  - [ ] `npm ci`
  - [ ] `npm run db:migrate`
  - [ ] `npm run dev`, open `http://localhost:3000/docs`, run all four routes with "Try it out"
  - [ ] Run every request in `requests.http` and in the Postman collection; statuses match PRD section 12
  - [ ] `npm test` passes
  - [ ] `npm run build && npm start`, `/docs` still loads
- [ ] Tag `v1.0.0` created and pushed.
- [ ] Delivery format confirmed in the assessment email and deadline respected with margin.

## Hard Stops — halt and report if
- A requirement can only be met by breaking a rule.
- A test cannot pass without changing PRD behavior.
- A dependency requires disabling a lint rule, a type check, or writing comments.

## Appendix — Reference Files
Use these exactly. They are tuned to work together.

### `.env.example`
```
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=contacts
DB_PASSWORD=contacts
DB_NAME=contacts
DB_ROOT_PASSWORD=root
```

### `.env.test`
```
NODE_ENV=test
PORT=3001
LOG_LEVEL=silent
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=contacts
DB_PASSWORD=contacts
DB_NAME=contacts_test
```

### `docker-compose.yml`
```yaml
services:
  mysql:
    image: mysql:8.4
    container_name: contacts-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-root}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    ports:
      - "${DB_PORT:-3306}:3306"
    volumes:
      - mysql-data:/var/lib/mysql
      - ./docker/mysql/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  mysql-data:
```

### `docker/mysql/init/01-create-test-database.sh`
```sh
#!/bin/sh
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}_test\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}_test\`.* TO '${MYSQL_USER}'@'%';
SQL
```

### `.gitattributes`
```
* text=auto eol=lf
```

### `src/shared/http/api-docs.ts`
```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';

const OPENAPI_FILE_PATH = fileURLToPath(new URL('../../../docs/openapi.yaml', import.meta.url));

export function createApiDocsRouter(): Router {
  const document = parse(readFileSync(OPENAPI_FILE_PATH, 'utf8')) as swaggerUi.JsonObject;
  const router = Router();
  router.use('/', swaggerUi.serve, swaggerUi.setup(document));
  return router;
}
```

Dependencies: `npm i swagger-ui-express yaml` and `npm i -D @types/swagger-ui-express`.

### `docs/openapi.yaml`
```yaml
openapi: 3.0.3
info:
  title: Contacts API
  version: 1.0.0
  description: REST API to manage contacts with name and phone.
servers:
  - url: http://localhost:3000
tags:
  - name: Contacts
paths:
  /contatos:
    get:
      tags: [Contacts]
      summary: List all contacts
      responses:
        '200':
          description: Contact list ordered by id
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Contact' }
    post:
      tags: [Contacts]
      summary: Create a contact
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateContact' }
      responses:
        '201':
          description: Contact created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Contact' }
        '400': { $ref: '#/components/responses/BadRequest' }
        '413': { $ref: '#/components/responses/PayloadTooLarge' }
  /contatos/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: integer, minimum: 1, maximum: 4294967295 }
    patch:
      tags: [Contacts]
      summary: Partially update a contact
      description: Send nome, telefone or both. Same validation rules as creation.
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/UpdateContact' }
      responses:
        '200':
          description: Contact updated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Contact' }
        '400': { $ref: '#/components/responses/BadRequest' }
        '404': { $ref: '#/components/responses/NotFound' }
    delete:
      tags: [Contacts]
      summary: Delete a contact
      responses:
        '204':
          description: Contact deleted, empty body
        '400': { $ref: '#/components/responses/BadRequest' }
        '404': { $ref: '#/components/responses/NotFound' }
components:
  schemas:
    ContactName:
      type: string
      maxLength: 100
      description: At least two words, letters only (accents allowed), each word with three or more letters.
      example: João Silva
    ContactPhone:
      type: string
      description: 10 or 11 digits with area code; spaces, parentheses and hyphens allowed. Returned as digits only.
      example: (11) 98765-4321
    Contact:
      type: object
      properties:
        id: { type: integer, example: 1 }
        nome: { type: string, example: João Silva }
        telefone: { type: string, example: '11987654321' }
    CreateContact:
      type: object
      additionalProperties: false
      required: [nome, telefone]
      properties:
        nome: { $ref: '#/components/schemas/ContactName' }
        telefone: { $ref: '#/components/schemas/ContactPhone' }
    UpdateContact:
      type: object
      additionalProperties: false
      minProperties: 1
      properties:
        nome: { $ref: '#/components/schemas/ContactName' }
        telefone: { $ref: '#/components/schemas/ContactPhone' }
    Error:
      type: object
      properties:
        error:
          type: object
          properties:
            code: { type: string, example: VALIDATION_ERROR }
            message: { type: string, example: Invalid request data }
            details:
              type: array
              items:
                type: object
                properties:
                  field: { type: string, example: nome }
                  message: { type: string }
  responses:
    BadRequest:
      description: Validation error or malformed JSON
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    NotFound:
      description: Contact not found
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    PayloadTooLarge:
      description: Body exceeds 10kb
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
```

### `.github/workflows/ci.yml`
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.4
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: contacts_test
          MYSQL_USER: contacts
          MYSQL_PASSWORD: contacts
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping -h localhost"
          --health-interval=5s
          --health-timeout=3s
          --health-retries=10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run format:check
      - run: npm run lint
      - name: Check for code comments
        run: "! grep -rnE '(^|\\s)//|/\\*' src tests"
      - run: npm run typecheck
      - run: npm run build
      - run: npm test
```
