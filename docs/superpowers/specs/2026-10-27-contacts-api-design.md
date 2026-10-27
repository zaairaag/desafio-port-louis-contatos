# Contacts API — Design Specification

**Status:** Proposed for user review. This document specifies future behavior; it does not report implemented or verified application behavior.
**Scope:** One local Contacts API, including its tooling, database, interactive documentation and delivery requirements.
**Acceptance annex:** [Verification and delivery specification](2026-10-27-contacts-api-acceptance.md).
**Implementation gate:** Review this specification and its annex before producing an implementation plan or writing application code.

## 1. Authority, evidence and approach

Read the sources in this order:

1. [PRD](../../PRD.md): authoritative product behavior, constraints and delivery contract.
2. [RULES](../../RULES.md): authoritative engineering standards.
3. [AGENT](../../AGENT.md): operating workflow and reference artifacts.

This package consolidates those sources; it does not replace them. A conflict between PRD and RULES stops implementation and must be reported. New choices below are explicitly marked **proposed conventions**, not attributed to the assessment. No original assessment email or external brief is present in the inspected project, so its deadline and delivery format are not claimed to be known.

At specification time, the project contains `README.md`, the three source documents and local agent metadata. There is no application, package manifest, migration, test suite or CI workflow to treat as an existing implementation.

### Alternatives considered

| Approach                                                 | Benefit                                                                  | Trade-off                                                                   | Decision |
| -------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------- |
| A single copied version of the three source files        | Simple navigation                                                        | Repeats reference files and makes future drift likely                       | Rejected |
| One consolidated design with a separate acceptance annex | One coherent API contract, explicit decisions and traceable verification | Requires keeping two linked documents aligned                               | Selected |
| Independent specifications for each CRUD operation       | Small individual documents                                               | Artificial subsystem boundaries; repeats schemas, errors and infrastructure | Rejected |

The design and annex are one specification package for one implementation plan. They are not independently evolving subsystems. Existing reference file contents remain in AGENT rather than being copied into new competing templates.

## 2. Product boundary

### R01 — Scope and exclusions

Deliver a REST API for creating, listing, partially updating and deleting contacts. A contact contains a name and a phone number. Run locally using Node.js, Express and MySQL. An evaluator must be able to configure and run the project using the README in under five minutes once prerequisites are available.

Do not add authentication, authorization, pagination, search, filtering, configurable sorting, phone uniqueness, `GET /contatos/:id`, a frontend application, CORS, deployment or cloud infrastructure. Swagger UI is evaluator tooling, not a frontend product. Do not add endpoints such as health checks.

### R02 — Global technology and language constraints

- Runtime: Node.js 22 LTS (`.nvmrc` = `22`, `engines.node` = `>=22`).
- Language: TypeScript (strict), ESM.
- Framework: Express 5.
- Database: MySQL 8.4 via `mysql2/promise` (connection pool).
- Validation: Zod 4.
- Development runner: `tsx`; no development build step.
- Environment: `dotenv` plus Zod startup validation.
- Logging: `pino`; `pino-pretty` in development only.
- Security headers: `helmet`.
- Interactive documentation: `swagger-ui-express`, `yaml`, static OpenAPI 3.0.3.
- Testing: Vitest and Supertest.
- Tooling: ESLint flat config, typescript-eslint, Prettier, Husky, lint-staged and commitlint.
- Database provisioning: Docker Compose or a manual MySQL installation.
- CI: GitHub Actions with a MySQL service.
- English code, identifiers, file names, commits, error messages, logs, documentation and tests.
- Public API exceptions: `/contatos`, `nome`, `telefone`.
- Zero comments in source code and tests; no inline lint or TypeScript suppressions.
- Relative ESM imports end with `.js`.
- Windows, macOS and Linux support; LF line endings.

Other dependency versions are selected at implementation time for compatibility with these constraints and recorded in the npm lockfile. This specification does not invent additional version floors or dependencies.

## 3. Architecture and interfaces

### R03 — Ownership and dependency direction

Use the file structure from RULES section 5. Dependencies flow in one direction: routes → controller → service → repository.

| File or directory                                                     | Responsibility                                                             | Must not own                                             |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| `src/app.ts`                                                          | Construct and return the Express app; mount middleware and routers         | Listening socket, shutdown process                       |
| `src/server.ts`                                                       | Start HTTP, startup logging, signal handling and resource disposal         | Contact business rules                                   |
| `src/config/env.ts`                                                   | Load and validate application environment                                  | SQL or HTTP behavior                                     |
| `src/database/connection.ts`                                          | Shared MySQL pool                                                          | Per-request pools                                        |
| `src/database/migrate.ts`                                             | Execute migration files in filename order                                  | HTTP startup or schema changes in code                   |
| `src/modules/contacts/contact.module.ts`                              | Instantiate repository, service and controller using constructor injection | Duplicated construction elsewhere                        |
| `contact.routes.ts`                                                   | Paths, methods and middleware wiring                                       | Validation implementations, business rules, SQL          |
| `contact.controller.ts`                                               | Consume parsed input, map API/domain, invoke service, set response status  | Re-parsing, SQL, business rules, try/catch               |
| `contact.service.ts`                                                  | Domain operations and existence checks                                     | Express requests/responses or DB connection construction |
| `contact.repository.ts`                                               | Parameterized SQL and domain results                                       | HTTP or input validation                                 |
| `contact.schemas.ts`                                                  | Zod schemas, normalization, inferred DTOs and validation constants         | Database access                                          |
| `contact.mapper.ts`                                                   | API ↔ domain and database row → domain conversion                          | Validation or persistence                                |
| `contact.types.ts`                                                    | Domain and repository boundary types                                       | Handwritten copies of Zod DTOs                           |
| `src/shared/errors/`                                                  | `AppError`, `ValidationError`, `NotFoundError`, error codes                | Request handling                                         |
| `src/shared/http/http-status.ts`                                      | Named HTTP status constants                                                | Business behavior                                        |
| `src/shared/http/api-docs.ts`                                         | Construct Swagger router from the static document                          | Generated comment-based schemas                          |
| `src/shared/logger/logger.ts`                                         | Shared logger configuration                                                | Request payload logging                                  |
| `src/shared/middlewares/validate.ts`                                  | Reusable params/body validation and parsed-value handoff                   | Contact-specific SQL                                     |
| `error-handler.ts`, `not-found-handler.ts`                            | Shared error serialization and route fallback                              | Business rules                                           |
| `database/migrations/`                                                | Idempotent schema changes                                                  | Runtime application code                                 |
| `tests/setup/`, `tests/helpers/`, `tests/unit/`, `tests/integration/` | Isolated test environment and behavior verification                        | Production startup side effects                          |

File names without a full path in the contacts rows belong to `src/modules/contacts/`; the two handler files belong to `src/shared/middlewares/`.

### Proposed internal boundary conventions

These names make the design implementable without adding public API fields. Public request DTOs are inferred from Zod and then translated by the mapper; the following are domain types, not duplicated DTO definitions:

```ts
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

export interface ContactRepository {
  create(input: CreateContactInput): Promise<Contact>;
  findAll(): Promise<Contact[]>;
  findById(id: number): Promise<Contact | null>;
  update(id: number, input: UpdateContactInput): Promise<void>;
  delete(id: number): Promise<void>;
}
```

`ContactService` exposes `create(input): Promise<Contact>`, `list(): Promise<Contact[]>`, `update(id, input): Promise<Contact>` and `delete(id): Promise<void>` using the domain types above and numeric IDs. A concrete repository implementation satisfies `ContactRepository`; services depend on this boundary so unit tests can replace persistence without loading environment configuration.

Schemas provide normalized public DTOs. The mapper converts them into domain inputs, preserves absent PATCH properties, and converts service results to the public representation. Do not spread explicit `undefined` values into optional properties under `exactOptionalPropertyTypes`. Response mapping exposes exactly `id`, `nome` and `telefone`.

Reusable validation must hand parsed values to controllers without re-parsing. Express 5 route params are not assumed to be writable storage: use a typed request-local handoff, such as `res.locals`, for parsed numeric IDs. Normalized body values replace the raw body as required by RULES section 7. This is a proposed implementation convention, not a public contract change.

### R04 — Data model and SQL

Create `database/migrations/001_create_contacts_table.sql` with the exact PRD schema:

```sql
CREATE TABLE IF NOT EXISTS contacts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(11) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

`utf8mb4` preserves accented names. Timestamps are database-only. There is no unique phone constraint; duplicate names and phones are accepted when the inputs otherwise validate.

Use `?` placeholders for all values. Dynamic UPDATE column names come exclusively from an internal whitelist mapping `name` and `phone`; never from request keys. Use one shared connection pool. Schema changes occur only through SQL migrations. Do not use UPDATE `affectedRows` to infer existence, because unchanged values can produce zero changed rows.

## 4. Input contract

### R05 — Name normalization and validation

For each supplied `nome`:

1. Require a string, without coercion.
2. Normalize Unicode to NFC.
3. Trim leading/trailing whitespace and collapse consecutive whitespace to one space.
4. Require at most 100 characters after normalization.
5. Require `^\p{L}{3,}(?: \p{L}{3,})+$` with the `u` flag.

There must be at least two words; every word contains only letters and has at least three letters. Preserve case and accents. Do not remove particles, hyphens, apostrophes or digits to make an invalid name pass.

Named schema constants include `NAME_MIN_WORDS`, `NAME_MIN_WORD_LENGTH` and `NAME_MAX_LENGTH`.

**Proposed convention D01:** Use Zod's native string length measurement for the 100-character limit, meaning JavaScript UTF-16 code units after NFC/whitespace normalization. The PRD does not specify supplementary-plane letter counting; this choice is explicit for review rather than silently introducing grapheme counting.

### R06 — Phone normalization and validation

For each supplied `telefone`:

1. Require a string, without coercion.
2. Before stripping punctuation, require `^[\d\s()-]+$`.
3. Remove every non-digit character.
4. Require `^[1-9]\d{9,10}$` on the normalized result.
5. Store and return digits only.

Accept 10 or 11 digits and reject a leading zero. Do not validate real Brazilian area-code allocations or impose an extra mobile-prefix rule. Reject `+55`, letters and other disallowed characters rather than silently stripping them.

Named schema constants include `PHONE_ALLOWED_CHARACTERS` and `PHONE_PATTERN`.

### R07 — Path ID

The original string must match `^[1-9]\d*$` and represent a value no greater than `4294967295`, the `INT UNSIGNED` maximum. Convert only after validating the full lexical form and bound. IDs are numbers internally and in successful responses.

Reject zero, negatives, leading zeros, decimal notation, exponent notation, signs, whitespace, suffixes and overflow. Do not use permissive `parseInt` alone. The named schema constant is `ID_MAX_VALUE`.

### R08 — Request bodies

Create and update schemas use `z.strictObject` and reject unknown keys. POST requires both `nome` and `telefone`. PATCH accepts either field or both, with at least one property; every provided property satisfies the POST field rules. Reject nulls, arrays, primitives and explicit non-string field values.

Missing bodies and non-JSON content types produce 400 `VALIDATION_ERROR` on POST/PATCH; Express 5 may leave `req.body` undefined. Do not convert missing bodies into an empty successful update, and do not introduce 415 responses.

Normalization happens inside Zod transforms. Controllers consume normalized values, not raw data. Validation failure does not access or modify persistence.

### R09 — Parsing and evaluation order

Configure `express.json({ limit: '10kb' })`. For JSON input the limit is 10,240 bytes; it is not a JavaScript character count. A body exactly at the limit is not oversized, though it may still fail schema validation.

The global JSON parser runs before route middleware, so malformed or oversized JSON fails before route-level validation. For a successfully parsed PATCH request, evaluation order is ID validation → body validation → existence check. Consequently, a malformed JSON body with an invalid path ID produces `INVALID_JSON`; a parsed invalid body with a valid nonexistent ID produces `VALIDATION_ERROR`, not `CONTACT_NOT_FOUND`.

The size limit applies to requests processed by this JSON parser; do not add other content-type parsers or change unsupported-content behavior. A syntactically valid JSON primitive may be rejected by Express's default strict JSON parser before Zod; root arrays reach object validation. Preserve the centralized mapping of parser errors rather than promising all root values take the same validation path.

## 5. HTTP operations

Base URL: `http://localhost:3000`.

Public representation:

```json
{ "id": 1, "nome": "João Silva", "telefone": "11987654321" }
```

### R10 — POST /contatos

Validate and normalize both fields, translate to the domain, insert and return 201 with the full public contact. The database supplies the ID. Return normalized values, not the original formatting. Repeated valid phone numbers must not cause a conflict response.

Defined failures: 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`, or the shared 500 fallback for an unexpected error.

### R11 — GET /contatos

Select all contacts ordered by `id ASC`. Return 200 with a JSON array; an empty database returns `[]`. Map each item to the public representation without timestamps. Do not implement query-based filtering, pagination or alternate sorting.

### R12 — PATCH /contatos/:id

After parsing, validate ID and body in that order. The service calls `findById`; null produces 404 `CONTACT_NOT_FOUND`. Update only supplied fields and return 200 with the full normalized contact, preserving fields not supplied. Sending the existing values remains a successful 200 operation.

The proposed repository boundary returns no UPDATE result to the service. After a successful update, the service returns the known existing entity merged with the validated domain patch. The schema has no triggers or application-managed timestamp fields requiring a post-update read.

Defined failures: 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 404 `CONTACT_NOT_FOUND`, the global 413 parser error, and shared 500 fallback. No upsert behavior. Cross-request transactional guarantees are outside the source requirements; do not add locks, transactions or a concurrency-specific error contract as part of this task.

### R13 — DELETE /contatos/:id

Validate ID, then check existence in the service. A missing entity produces 404 `CONTACT_NOT_FOUND`; an existing entity is deleted and returns 204 with zero response-body bytes. The controller ends the response with `res.status(HTTP_STATUS.NO_CONTENT).end()`.

Deleting the same ID again returns 404. Never send a success message or JSON body with 204. Invalid IDs return 400 `VALIDATION_ERROR`. Unexpected persistence failures follow the shared 500 contract.

### R14 — Errors and fallback routes

Every error uses a JSON object with the `error` envelope. For example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "nome",
        "message": "Name must have at least two words with three letters each"
      }
    ]
  }
}
```

| Code                | HTTP status | Trigger                                                            |
| ------------------- | ----------- | ------------------------------------------------------------------ |
| `VALIDATION_ERROR`  | 400         | Invalid route ID or schema input                                   |
| `INVALID_JSON`      | 400         | Parser error with type `entity.parse.failed`                       |
| `CONTACT_NOT_FOUND` | 404         | Update/delete target absent                                        |
| `ROUTE_NOT_FOUND`   | 404         | No registered route matches, including unsupported contact methods |
| `PAYLOAD_TOO_LARGE` | 413         | Parser error with type `entity.too.large`                          |
| `INTERNAL_ERROR`    | 500         | Unexpected failure                                                 |

Only `VALIDATION_ERROR` includes `details`. Field-level issues use `nome`, `telefone` or `id`, never internal `name`/`phone`. Messages are English and specific. The 500 message is generic and exposes no driver message, SQL, stack or configuration.

Use the specified `AppError` base class with `statusCode`, `code`, `message`, and the `ValidationError` and `NotFoundError` subclasses. Keep one centralized serializer. Express 5 forwards rejected handler promises; do not add async wrappers or controller try/catch blocks.

**Proposed convention D02:** The sources do not define `details[].field` for a root object error or an unknown key. Represent these object-level issues with `field: ''`, the empty root path, and a specific English message identifying the body problem or unexpected key. Missing known properties use their public property name. This does not add a response field, but it extends the illustrated field values and therefore requires explicit review before implementation. No error-detail ordering is promised.

**Proposed convention D03:** Exact wording is fixed only where the PRD explicitly supplies it: validation envelope message `Invalid request data`. Other messages must meet the English/specificity/privacy requirements; consumers and tests must not depend on incidental library wording. Codes, statuses, field mapping and details presence are contractual.

### R15 — Swagger and middleware composition

`app.ts` disables `x-powered-by` and mounts middleware in this exact order:

1. `/docs` router.
2. `helmet()`.
3. `express.json({ limit: '10kb' })`.
4. Contact routes.
5. Not-found handler.
6. Error handler.

`/docs` redirects to `/docs/`; the latter returns 200 HTML and working Swagger UI assets. Mount it before Helmet because Helmet's default CSP blocks Swagger UI. Every API route remains behind Helmet; do not weaken API CSP globally to fix documentation.

Use the `src/shared/http/api-docs.ts` reference from AGENT verbatim. Parse `docs/openapi.yaml` once when constructing the router, not on each request. Resolve assets outside `src` through `import.meta.url` so development and compiled files at the same folder depth use the repository's document and migration paths.

The OpenAPI reference in AGENT is also required verbatim. It documents the four operations but does not enumerate all shared 500 responses or the global PATCH 413 response; it also describes normalization in prose rather than fully encoding it as schema keywords. These are known coverage limitations of the supplied reference, not permission to change runtime behavior. Preserve the reference, test runtime behavior against the PRD, and request source approval before enhancing the required-exact template. Do not claim the OpenAPI schema alone fully validates the contract.

## 6. Environment and lifecycle

### R16 — Environment and local databases

Use the exact `.env.example`, `.env.test`, `docker-compose.yml`, Docker init script and `.gitattributes` reference contents from AGENT. `config/env.ts` calls dotenv with `quiet: true` and validates startup values with Zod. Invalid configuration produces a clear log and exit code 1 without exposing secret values.

Only `config/env.ts` and test setup files read `process.env`. The application imports parsed configuration. `.env` is ignored; templates and test configuration are versioned. Test credentials are local fixtures, not production secrets.

| Variable           | Development template | Test template   | Purpose                                                  |
| ------------------ | -------------------- | --------------- | -------------------------------------------------------- |
| `NODE_ENV`         | `development`        | `test`          | Runtime mode                                             |
| `PORT`             | `3000`               | `3001`          | HTTP port                                                |
| `LOG_LEVEL`        | `info`               | `silent`        | Pino level                                               |
| `DB_HOST`          | `127.0.0.1`          | `127.0.0.1`     | Avoid localhost resolution differences                   |
| `DB_PORT`          | `3306`               | `3306`          | Host MySQL port                                          |
| `DB_USER`          | `contacts`           | `contacts`      | Local database user                                      |
| `DB_PASSWORD`      | `contacts`           | `contacts`      | Local database password                                  |
| `DB_NAME`          | `contacts`           | `contacts_test` | Separate application and integration data                |
| `DB_ROOT_PASSWORD` | `root`               | Not present     | Docker provisioning only, not an application requirement |

**Proposed convention D04:** Require the application variables rather than supplying a second hidden default set. Coerce `PORT`/`DB_PORT` to integer values from 1 through 65535, allow `development`, `test`, `production` for `NODE_ENV`, and allow Pino's standard levels plus `silent` for `LOG_LEVEL`. Require nonempty DB host/user/name and a present string DB password, allowing an empty password for a manually configured local server. Do not require Docker's root password in the application schema. These boot-validation details are not exhaustively specified by the sources and remain reviewable design choices.

Docker runs MySQL 8.4 with a healthcheck and a named volume. On first volume initialization, its init script creates `<DB_NAME>_test` and grants access to `DB_USER`. The supplied templates use `contacts` and `contacts_test`. Changing the application database name does not automatically rewrite `.env.test`; configurations must be kept aligned.

Init scripts do not rerun for an existing volume. Document `docker compose down -v` only as an explicitly destructive reset, not as a normal startup or verification step. The manual MySQL setup SQL comes from PRD section 11.3. When changing a local host port, update both local application and test configurations.

### R17 — Migrations and resource paths

`npm run db:migrate` executes every SQL migration in filename order and closes its pool on completion or failure. Schema migrations are idempotent, starting with `IF NOT EXISTS`; applying them twice preserves existing data. Do not add a migration history subsystem or runtime schema synchronization.

Integration global setup applies the same migrations to `contacts_test`. Use URL-relative paths rather than depending on the shell working directory for migration and OpenAPI assets. Build output contains application code under `dist`; the source-controlled `database/` and `docs/` directories remain repository-level runtime assets.

### R18 — Startup, shutdown and privacy

`app.ts` must be importable without opening a listening socket. `server.ts` starts the application and logs the listening address and `/docs` URL. Invalid environment configuration exits with code 1. Signal handling for SIGINT and SIGTERM closes the HTTP server and the shared pool; repeated signals must not dispose resources twice.

Use the shared Pino logger, with level from configuration and pretty transport only in development. Tests use `silent`. Log startup, shutdown and unexpected errors. Never log names, phones or request bodies. Unexpected-error logging must also avoid input-derived driver properties such as SQL strings; logging an error object is not permission to leak contact data. Do not introduce request logging, metrics, retries or background jobs.

## 7. Engineering and evaluator artifacts

### R19 — Code quality and Git controls

Use `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, and `module: NodeNext`. Typecheck includes `src` and `tests`; build includes only `src`, with `rootDir: src` and `outDir: dist`.

Naming follows RULES section 3: kebab-case file names with role suffixes, PascalCase classes/types without an `I` prefix, camelCase variables and verb-led functions, UPPER_SNAKE_CASE constants, and snake_case database columns. Boolean names start with `is`, `has` or `should`. Do not abbreviate identifiers except Express `req`, `res`, `next`. Functions have one responsibility and ideally no more than 20 lines.

No `any`; narrow `unknown`. Use explicit exported boundary types and named exports in project code; tool-required config defaults and third-party default imports are allowed. Prefer small single-purpose functions, early returns, `const` and async/await. No `var`, nested ternaries, `.then()` chains, application callback-style flow or `console.*` in `src`. Framework-required handler signatures are not a license for callback-based business logic. Use named constants for statuses, error codes, limits and paths.

Prettier is authoritative: single quotes, semicolons, two spaces, trailing commas, width 100, LF. Configure ESLint exactly as RULES section 15 requires, including type-aware rules, `projectService`, no inline config, `eslint-config-prettier` last and zero warnings. Commit `.editorconfig`, `.gitattributes`, `.prettierrc`, `.prettierignore` and the npm lockfile.

Husky hooks: pre-commit runs `npx lint-staged && npm run typecheck`; commit-msg runs `npx --no -- commitlint --edit "$1"`; pre-push runs unit tests. lint-staged applies ESLint autofix plus Prettier to TypeScript and Prettier to JSON/Markdown/YAML. No bypasses or inline suppressions.

Commits are small, atomic, imperative, lowercase Conventional Commits of at most 72 characters. Allowed types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`. Do not rewrite dates or commit `.env`, `node_modules`, `dist` or `coverage`. No pushes to main after delivery.

### R20 — Automated verification structure

Vitest has `unit` and `integration` projects. Unit tests exercise schemas and the service with a replaceable repository; importing a unit subject must not load `config/env.ts` or create a DB connection. Integration tests use Supertest, real MySQL and `contacts_test`.

Global setup loads `.env.test` and applies migrations. Worker setup loads `.env.test` with `override: true` before application imports. Run integration files sequentially and truncate the contacts table before each test. Close test resources. Verify the test database target before destructive setup; never truncate the development database.

Use behavior-focused names and Arrange/Act/Assert, one behavior per test. Cover every PRD validation example and endpoint status, unchanged PATCH values, empty DELETE responses and HTML documentation. Do not set an arbitrary coverage-percentage gate; the sources require a coverage command, not a numerical target. The acceptance annex supplies concrete fixtures and observable results.

### R21 — Interactive documentation and request collections

Provide static `docs/openapi.yaml`, Postman v2.1 `docs/contacts-api.postman_collection.json`, and root `requests.http`. Use English descriptions with Portuguese API property names. Whenever runtime contract behavior changes after these artifacts exist, update all three in the same commit.

Both collections contain exactly the 15 ordered cases in PRD section 12. Use the collection `baseUrl` variable or REST Client `@baseUrl`, defaulting to `http://localhost:3000`. Postman's create-response test stores `contactId`; REST Client names the initial request `createContact` and references its response ID. Do not substitute a hardcoded ID for the created contact.

`requests.http` uses `###` separators as required by RULES; this request-file syntax is not a source-code comment exception. Swagger UI provides all four operations for manual reproduction, including invalid payloads. Collections' nonexistent ID `999999` assumes a fresh isolated database; verify it is absent before the sequence rather than treating it as universally nonexistent.

### R22 — Scripts, CI and delivery

The exact public script names and delivery gates are specified in the acceptance annex. Preserve the CI reference from AGENT verbatim: MySQL 8.4 service, Node from `.nvmrc`, `npm ci`, formatting, lint, comment check, typecheck, build and full test suite. CI runs on main pushes and pull requests.

README order, quick start, evaluator tools and design-decision coverage follow PRD sections 9 and 14. The Docker quick start has at most five commands, begins with `cp .env.example .env`, and explains the healthy-database prerequisite without hiding extra commands. On Windows, provide the PowerShell equivalent `Copy-Item .env.example .env` as an alternative, not an extra mandatory step.

The delivery operator must obtain format and deadline from the original assessment email. A public GitHub link, ZIP or collaborator access are alternatives governed by that email, not simultaneous mandatory publication actions. A one-line GitHub About description, fresh-clone verification, green final CI and `v1.0.0` release identification are required. Publication, collaborator grants, tag pushes and the email are separate authorized delivery actions, not actions performed while writing this specification.

## 8. Review decisions and next boundary

The following choices are additional internal/detail-level conventions, not changes to the source product scope:

| Decision            | Review target                                                             | Effect                                                                                  |
| ------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| D01                 | Name length uses normalized UTF-16 code units                             | Fixes an otherwise unspecified Unicode boundary                                         |
| D02                 | Object-level validation errors use an empty field path                    | Defines root/unknown-property error details without pretending a public property exists |
| D03                 | Error semantics, not unspecified exact wording, are stable                | Avoids coupling consumers to library text                                               |
| D04                 | Explicit boot-validation rules and no hidden defaults                     | Makes environment failures reproducible                                                 |
| Internal interfaces | Domain types, repository signatures and parsed-param handoff in section 3 | Keeps service tests DB-independent and compatible with Express 5                        |

All five review targets are fully proposed here; none is an unfilled implementation placeholder. If the user rejects one, revise the affected contract and acceptance rows before planning. The exact-reference OpenAPI limitations in R15 are recorded rather than silently repaired.

This package is ready for specification review only. It does not approve implementation, record passing tests, create commits, publish artifacts or send the assessment response. After approval, use the Superpowers writing-plans workflow to create a separate, task-sized implementation plan linked to both documents.
