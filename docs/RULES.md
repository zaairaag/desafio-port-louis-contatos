# RULES — Engineering Standards

These rules are mandatory. Any violation blocks a commit.

## 1. Language
- Code, identifiers, file names, commits, error messages, logs, docs and tests: **English**.
- Exception: the public API contract (`/contatos`, `nome`, `telefone`) stays as the assessment defines. Translate only in the mapper.
- Database: English, `snake_case`.

## 2. Comments
- **Zero comments in source code**: no `//`, no `/* */`, no JSDoc, no TODO, no commented-out code.
- No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`.
- Enforced by ESLint `linterOptions.noInlineConfig: true`, `@typescript-eslint/ban-ts-comment`, and a CI step.
- Comment check (local and CI): `grep -rnE "(^|\s)//|/\*" src tests` must return nothing.
- Never use tools that depend on code comments (for example `swagger-jsdoc`).
- If code needs a comment, rename or extract a function.

## 3. Naming
| Element | Convention | Example |
|---|---|---|
| Files | kebab-case + role suffix | `contact.service.ts`, `error-handler.ts` |
| Classes / Types | PascalCase, no `I` prefix | `ContactService`, `Contact` |
| Functions / variables | camelCase, verbs for functions | `createContact`, `findById` |
| Constants | UPPER_SNAKE_CASE | `NAME_MIN_WORD_LENGTH` |
| Booleans | `is/has/should` prefix | `isEmpty` |
| DB columns | snake_case | `updated_at` |

No abbreviations. Only exceptions: `req`, `res`, `next` in Express handlers.

## 4. TypeScript
- `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`.
- ESM with `module: NodeNext`; relative imports end with `.js`.
- `tsconfig.json` covers `src` and `tests` (typecheck). `tsconfig.build.json` covers `src` only (build, `rootDir: src`, `outDir: dist`).
- No `any`. Use `unknown` and narrow.
- Explicit types on exported function boundaries.
- Named exports only in project code. No default exports (config files required by tools are the only exception). Default imports from third-party libraries are allowed.
- DTO types come from Zod (`z.infer`), never duplicated by hand.

## 5. Architecture
```
.github/workflows/ci.yml
.husky/
database/migrations/001_create_contacts_table.sql
docker/mysql/init/01-create-test-database.sh
docs/openapi.yaml
docs/contacts-api.postman_collection.json
src/
  app.ts
  server.ts
  config/env.ts
  database/connection.ts
  database/migrate.ts
  modules/contacts/
    contact.module.ts
    contact.routes.ts
    contact.controller.ts
    contact.service.ts
    contact.repository.ts
    contact.schemas.ts
    contact.mapper.ts
    contact.types.ts
  shared/errors/
  shared/http/http-status.ts
  shared/http/api-docs.ts
  shared/logger/logger.ts
  shared/middlewares/validate.ts
  shared/middlewares/error-handler.ts
  shared/middlewares/not-found-handler.ts
tests/
  setup/global-setup.ts
  setup/load-test-env.ts
  helpers/
  unit/
  integration/
requests.http
```

One direction only: routes → controller → service → repository.
- **Routes:** verbs, paths, middleware wiring. Nothing else.
- **Controller:** read validated input, call service, map response, set status. No business rules, no SQL, no try/catch.
- **Service:** business rules (existence checks). Throws domain errors. Knows nothing about Express or HTTP.
- **Repository:** SQL only. Returns domain entities or `null`. No validation.
- **Mapper:** API ↔ domain (`nome` ↔ `name`, `telefone` ↔ `phone`) and row → entity.
- **Module:** the only place where repository, service and controller are instantiated (constructor injection).
- `app.ts` builds the Express app (no `listen`, testable). `server.ts` starts it and handles shutdown.
- Files outside `src` (migrations, OpenAPI) are resolved from `import.meta.url`, so paths work from both `src` and `dist` (same folder depth).

## 6. Code Style
- Functions do one thing, ideally ≤ 20 lines.
- Early returns. No nested ternaries.
- No magic values: validation limits, HTTP statuses, error codes and file paths are named constants.
- `async/await` only. No `.then()` chains, no callbacks.
- `const` by default. Never `var`.
- No `console.*` in `src/`.
- Prettier is the only formatting authority: single quotes, semicolons, 2 spaces, trailing commas, print width 100, `endOfLine: lf`.

## 7. Validation
- Zod 4 schemas in `contact.schemas.ts`, applied by a reusable `validate` middleware (body and params).
- Use `z.strictObject` to reject unknown fields.
- Normalization (NFC, trim, whitespace collapse, digit extraction) happens inside the schema via `.transform()`.
- Parsed (normalized) values replace raw input; controllers never re-parse.
- `undefined` body must produce `VALIDATION_ERROR`, never a 500.
- Constants live with schemas: `NAME_MIN_WORDS`, `NAME_MIN_WORD_LENGTH`, `NAME_MAX_LENGTH`, `PHONE_ALLOWED_CHARACTERS`, `PHONE_PATTERN`, `ID_MAX_VALUE`.
- Validation messages are English and specific (say what is wrong, not just "invalid").

## 8. Errors
- Base class `AppError` (`statusCode`, `code`, `message`). Subclasses: `ValidationError`, `NotFoundError`.
- One centralized error handler formats every error per PRD section 8.
- Body-parser errors are identified by `type`: `entity.parse.failed` → `INVALID_JSON`; `entity.too.large` → `PAYLOAD_TOO_LARGE`.
- Express 5 forwards rejected promises to the error handler. No `try/catch` in controllers, no async wrappers.
- Driver errors never leak. 500 responses never expose stack traces or messages.
- Unexpected errors are logged with the logger (error object only, no request body).

## 9. Database
- Parameterized queries only (`?` placeholders). Concatenating input into SQL is forbidden.
- Dynamic UPDATE builds SET clauses only from a whitelist of columns.
- Do not use `affectedRows` from UPDATE to detect existence. The service calls `findById` first.
- One shared pool, closed on shutdown.
- Schema changes only via SQL files in `database/migrations/`.

## 10. HTTP
- Status codes exactly per PRD section 6, referenced via `HTTP_STATUS` constants.
- 204 responses: `res.status(HTTP_STATUS.NO_CONTENT).end()`. Never a body.
- `express.json({ limit: '10kb' })`.
- `app.disable('x-powered-by')`.
- Middleware order in `app.ts`: `/docs` router → `helmet()` → `express.json()` → contact routes → not-found handler → error handler.
- `/docs` is mounted before `helmet()` because helmet's default Content-Security-Policy breaks Swagger UI assets. Every API route stays behind helmet.

## 11. API Documentation
- `docs/openapi.yaml` (OpenAPI 3.0.3) is the single source for the interactive docs. Served by `swagger-ui-express` at `/docs`.
- The OpenAPI file is parsed once when the router is created, never per request.
- Any change to routes, bodies, validation rules, status codes or error shape updates `docs/openapi.yaml`, `requests.http` and the Postman collection **in the same commit**.
- Docs use the public contract names (`nome`, `telefone`) and English descriptions.
- Collections follow PRD section 12 exactly: same cases, same order, same expected statuses.
- Postman collection uses format v2.1, a `baseUrl` collection variable and a test script on the create request that sets `contactId`.
- `requests.http` uses `@baseUrl`, `###` separators and a named request `createContact` whose response id feeds later requests.

## 12. Logging
- `pino` instance in `shared/logger/logger.ts`, level from `LOG_LEVEL`.
- `pino-pretty` transport only when `NODE_ENV=development`.
- Log startup (including the `/docs` URL), shutdown and unexpected errors. Never log names, phones or bodies.
- Tests run with `LOG_LEVEL=silent`.

## 13. Environment
- `config/env.ts` loads dotenv (`quiet: true`) and validates with Zod. Invalid config → log the problem and exit with code 1.
- `process.env` is read only in `config/env.ts` (and test setup files).
- Use `127.0.0.1` as `DB_HOST`, not `localhost`.
- `.env` git-ignored. `.env.example` and `.env.test` committed and always in sync with the schema.

## 14. Testing
- Vitest with two projects:
  - `unit`: schemas and service (repository mocked). Must not import `config/env.ts` or the DB connection. Runs without MySQL.
  - `integration`: every endpoint and status code via Supertest against `contacts_test`, plus `GET /docs/` returning 200 HTML. `globalSetup` loads `.env.test` and runs migrations; `setupFiles` loads `.env.test` with `override: true`.
- Integration tests run sequentially (no file parallelism) and truncate `contacts` before each test.
- Test names describe behavior: `it('returns 404 when contact does not exist')`.
- Arrange / Act / Assert. One behavior per test.
- DELETE test asserts status 204 and empty body.
- Every invalid example in PRD section 7 has a test.

## 15. Tooling
- **ESLint (flat config):** `@eslint/js` recommended, `typescript-eslint` `strictTypeChecked` with `projectService`, `eslint-config-prettier` last. Ignore `dist`, `coverage`.
  - `linterOptions`: `noInlineConfig: true`, `reportUnusedDisableDirectives: 'error'`.
  - Rules: `no-console: error`, `eqeqeq: error`, `prefer-const: error`, `no-var: error`, `@typescript-eslint/no-explicit-any: error`, `@typescript-eslint/explicit-module-boundary-types: error`.
  - Run with `--max-warnings=0`.
- **Prettier:** `.prettierrc` and `.prettierignore` committed (`.prettierignore` includes `dist`, `coverage`, `package-lock.json`).
- **EditorConfig:** `.editorconfig` committed.
- **`.gitattributes`:** `* text=auto eol=lf` (required so the Docker `.sh` init script works after a Windows checkout).
- **lint-staged:** `*.ts` → `eslint --fix --max-warnings=0` + `prettier --write`; `*.{json,md,yml,yaml}` → `prettier --write`.
- **Husky:**
  - `pre-commit`: `npx lint-staged && npm run typecheck`
  - `commit-msg`: `npx --no -- commitlint --edit "$1"`
  - `pre-push`: `npm run test:unit`
- **commitlint:** `@commitlint/config-conventional`.
- **CI:** format check, lint, comment check, typecheck, build and full test suite with a MySQL service.

## 16. Git
- Conventional Commits: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`.
- Imperative, lowercase, ≤ 72 chars: `feat: add contact creation endpoint`.
- Small, atomic commits. Never one commit with everything.
- Never rewrite commit dates.
- Never commit `.env`, `node_modules`, `dist`, `coverage`.
- No pushes to `main` after delivery.

## 17. Forbidden
- Comments of any kind in source code.
- `any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`.
- `console.*` in `src/`.
- SQL built with input concatenation.
- Business logic in routes or controllers.
- Features outside PRD scope (phone uniqueness, `GET /contatos/:id`, frontend).
- `swagger-jsdoc` or any comment-driven documentation tool.
- Docs or collections out of sync with the API.
- `--no-verify`.

## 18. Review Checklist (every commit)
- [ ] English everywhere except the API contract
- [ ] No comments
- [ ] Lint, typecheck and tests pass with zero warnings
- [ ] Logic in the correct layer
- [ ] Status codes and error shape match the PRD
- [ ] OpenAPI and collections updated if behavior changed
- [ ] New behavior has a test
