# Contacts API — Verification and Delivery Specification

**Status:** Proposed acceptance contract; none of the application checks below has been executed at specification time.
**Design:** [Contacts API design specification](2026-10-27-contacts-api-design.md).
**Authority:** [PRD](../../PRD.md), [RULES](../../RULES.md), [AGENT](../../AGENT.md), in that order and with the design's conflict policy.

This annex defines observable results, test ownership and release evidence for the single API described by the design. `R01` through `R22` refer to its requirement headings. `D01` through `D04` are proposed conventions awaiting review; tests for those conventions become binding only after approval.

## 1. Verification rules

- A specification row is an acceptance obligation, not a claim that a test exists or passes.
- Unit tests run without MySQL, dotenv imports or a configured application environment.
- Integration tests use real MySQL `contacts_test`, sequential files and a clean table before every test.
- Do not use a developer database, an external database or destructive volume resets to prepare routine tests.
- Keep stable assertions on behavior, persisted data, statuses, error codes, public fields and privacy; do not pin unspecified library wording.
- Parameterized rows create separate cases per fixture. Combine related assertions only when they describe one observable behavior.
- API integration tests may import the app without listening. Development/build smoke checks must also start the real server; Supertest alone does not prove packaging or asset paths.
- For unexpected errors, inject a controlled persistence failure in an isolated test. Do not stop a shared database or expose real credentials to simulate failure.
- Before truncation or migration setup, verify that the configured target is the dedicated test database. Close all pools and HTTP servers created by tests.

## 2. Schema acceptance matrix

| Check | Requirement | Fixture or action                                                                               | Expected result                                                                                   | Layer |
| ----- | ----------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----- |
| V01   | R05         | `João Silva`, `Ana Paula Souza`                                                                 | Accepted with original case and accents                                                           | Unit  |
| V02   | R05         | `  José   Conceição  `                                                                          | Normalized to `José Conceição`                                                                    | Unit  |
| V03   | R05         | `Jose\u0301 Conceic\u0327a\u0303o`                                                              | NFC output `José Conceição`                                                                       | Unit  |
| V04   | R05         | Tabs/newlines between valid name words and at the edges                                         | Normalized to one internal space and no edge whitespace                                           | Unit  |
| V05   | R05         | `João`, `Jo Silva`, `Maria da Silva`                                                            | Rejected: missing second word or a word shorter than three letters                                | Unit  |
| V06   | R05         | `João Silva2`, `Ana-Maria Silva`, `D'Ávila Santos`, empty string                                | Rejected without stripping forbidden characters                                                   | Unit  |
| V07   | R05, R08    | `nome` absent, null, numeric, boolean, array or object                                          | Rejected without coercion                                                                         | Unit  |
| V08   | R05         | 48 `A` characters, one space, 51 `B` characters                                                 | Exactly 100 normalized units; accepted                                                            | Unit  |
| V09   | R05         | 49 `A` characters, one space, 51 `B` characters                                                 | 101 normalized units; rejected                                                                    | Unit  |
| V10   | R05         | 48 decomposed `A\u0301` sequences, one space, 51 `B` characters                                 | NFC length 100; accepted, demonstrating normalization before length check                         | Unit  |
| V11   | R05, D01    | 25 supplementary-plane letters `𐐀`, one space, 49 `B` characters; then 50 `B` characters        | 100 UTF-16 units accepted; 101 rejected, subject to D01 approval                                  | Unit  |
| V12   | R06         | `(11) 98765-4321`, `11 3456-7890`, `1134567890`                                                 | Outputs `11987654321`, `1134567890`, `1134567890` respectively                                    | Unit  |
| V13   | R06         | `12345`, `abc`, `11a987654321`, `+55 11 98765-4321`, `(01) 98765-4321`                          | Each rejected                                                                                     | Unit  |
| V14   | R06         | 9 digits, 12 digits, punctuation/whitespace only, empty string                                  | Rejected after character/length checks as applicable                                              | Unit  |
| V15   | R06, R08    | `telefone` absent, null, numeric, boolean, array or object                                      | Rejected without coercion                                                                         | Unit  |
| V16   | R06         | Valid digits separated by whitespace permitted by `\s`                                          | Accepted and returned as digits only                                                              | Unit  |
| V17   | R07         | `1`, `4294967295`                                                                               | Accepted as numeric domain IDs                                                                    | Unit  |
| V18   | R07         | `0`, `-1`, `01`, `1.0`, `1e2`, `+1`, ` 1`, `1 `, `1abc`, `abc`, `4294967296`                    | Each rejected before persistence access                                                           | Unit  |
| V19   | R08         | Valid POST object with both fields                                                              | Accepted with normalized public property names                                                    | Unit  |
| V20   | R08         | POST `{}` or either required property missing                                                   | Rejected with the missing public field identified                                                 | Unit  |
| V21   | R08         | POST or PATCH containing unknown `email`, internal `name` or internal `phone`                   | Rejected; internal property names are not accepted API aliases                                    | Unit  |
| V22   | R08         | PATCH containing only `nome`, only `telefone`, or both                                          | Accepted; omitted properties remain absent                                                        | Unit  |
| V23   | R08         | PATCH `{}` or undefined body                                                                    | Rejected; no no-op empty update                                                                   | Unit  |
| V24   | R08         | Undefined, null, root array, number, string or boolean submitted directly to either body schema | Rejected as a non-object schema input                                                             | Unit  |
| V25   | R08, D02    | Root object problem or unknown key                                                              | Proposed empty `field` path and specific body/key message; no invented `name`/`phone` field alias | Unit  |

V24 exercises schemas directly. Over HTTP, Express's default strict JSON parser can reject primitive/null JSON as `INVALID_JSON` before the schema runs; the integration expectations below preserve this distinction.

## 3. Service acceptance matrix

Use a typed replacement repository. The service test subject must not instantiate a DB pool or import application environment configuration.

| Check | Requirement | Fixture or action                                  | Expected result                                                                                                       |
| ----- | ----------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| V26   | R03, R10    | Create normalized domain input                     | Created domain entity returned; persistence receives domain fields                                                    |
| V27   | R03, R11    | Repository returns contacts or an empty array      | Service returns that collection without API property translation                                                      |
| V28   | R12         | Existing contact; patch only name                  | Full domain result contains new name and unchanged phone                                                              |
| V29   | R12         | Existing contact; patch only phone                 | Full domain result contains unchanged name and new phone                                                              |
| V30   | R12         | Existing contact; patch both fields                | Full domain result contains both changes                                                                              |
| V31   | R04, R12    | Existing contact; update supplies unchanged values | Successful domain result, regardless of UPDATE changed-row count                                                      |
| V32   | R12         | `findById` returns null for update                 | Not-found domain error; repository update is not called                                                               |
| V33   | R13         | Existing contact is deleted                        | Repository delete occurs after existence is established; service returns no entity                                    |
| V34   | R13         | `findById` returns null for deletion               | Not-found domain error; repository delete is not called                                                               |
| V35   | R14         | Repository rejects an operation                    | Failure reaches centralized handling through the caller; service does not fabricate success or leak a response object |

These rows specify business outcomes and negative effects. V26/V27 are covered through real HTTP/persistence checks V36/V44/V45, and V35 through V57; do not create permanent unit tests that merely echo mocked repository returns or forward a mocked rejection. Keep service unit tests focused on field preservation, unchanged updates, existence checks and preventing writes when a target is absent. Do not add tests merely asserting constructor wiring or duplicated mapper implementation text.

## 4. HTTP and persistence acceptance matrix

Every successful contact object has exactly `id`, `nome`, `telefone`; every error has the envelope from R14. Validation details appear only for `VALIDATION_ERROR` and use public property names for field-level issues.

| Check | Requirement        | Request or scenario                                                                | Observable result                                                                          |
| ----- | ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| V36   | R04, R05, R06, R10 | POST `{"nome":"  José   Conceição  ","telefone":"(11) 98765-4321"}`                | 201; normalized public object; subsequent GET exposes the same values                      |
| V37   | R04, R10           | Create two valid contacts with the same phone                                      | Both return 201 with distinct generated IDs                                                |
| V38   | R08, R10, R14      | POST invalid field fixtures or unknown key                                         | 400 `VALIDATION_ERROR`; no inserted row                                                    |
| V39   | R08, R10           | POST missing body or `text/plain` body                                             | 400 `VALIDATION_ERROR`, not 415 or 500                                                     |
| V40   | R09, R14           | POST/PATCH malformed JSON with `application/json`                                  | 400 `INVALID_JSON`; `details` absent; no write                                             |
| V41   | R09                | POST valid JSON primitive or null with default strict parser                       | 400 `INVALID_JSON`; root JSON array instead produces `VALIDATION_ERROR`                    |
| V42   | R09, R10, R12      | POST/PATCH JSON payload of 10,241 UTF-8 bytes                                      | 413 `PAYLOAD_TOO_LARGE`; no mutation                                                       |
| V43   | R05, R09           | POST valid contact JSON padded with name whitespace to exactly 10,240 bytes        | 201 with trimmed name; limit is not an exclusive bound or raw-name length limit            |
| V44   | R11                | GET on an empty table                                                              | 200 and exact array `[]`                                                                   |
| V45   | R04, R11           | Insert multiple contacts, then GET                                                 | 200; all contacts ordered by numeric `id ASC`, no timestamps or internal keys              |
| V46   | R12                | PATCH name only, phone only, or both on an existing contact                        | 200 full public object; omitted fields preserved; later GET confirms persistence           |
| V47   | R04, R12           | PATCH existing values onto an existing row                                         | 200, not a false 404 caused by `affectedRows`                                              |
| V48   | R08, R12           | PATCH `{}`, missing body, unknown key or invalid supplied field                    | 400 `VALIDATION_ERROR`; persisted row unchanged                                            |
| V49   | R07, R12, R13      | PATCH/DELETE with invalid ID fixtures                                              | 400 `VALIDATION_ERROR` with `id` detail; no write                                          |
| V50   | R12                | PATCH nonexistent valid ID with valid body                                         | 404 `CONTACT_NOT_FOUND`, no validation details                                             |
| V51   | R09, R12           | PATCH nonexistent valid ID with invalid parsed body                                | 400 `VALIDATION_ERROR`, not 404                                                            |
| V52   | R09, R12           | PATCH invalid ID plus invalid parsed body                                          | 400 with ID issue; body validation/existence lookup do not run first                       |
| V53   | R09, R12           | PATCH invalid ID plus malformed JSON                                               | 400 `INVALID_JSON`, because global parsing precedes route validation                       |
| V54   | R13                | DELETE existing ID                                                                 | 204; `response.text === ''`; later GET no longer includes the contact                      |
| V55   | R13                | DELETE the same ID again                                                           | 404 `CONTACT_NOT_FOUND`                                                                    |
| V56   | R01, R14           | GET `/contatos/1`, PUT `/contatos/1`, or an unknown path                           | 404 `ROUTE_NOT_FOUND`; no extra endpoint or method-specific 405 contract                   |
| V57   | R14                | Controlled unexpected persistence error                                            | 500 `INTERNAL_ERROR`; generic English message; no stack, SQL, driver text or details       |
| V58   | R03, R14           | Valid persisted accented contact read back after pool reacquisition                | Accents and normalized phone survive MySQL storage, not merely an in-memory response       |
| V59   | R04                | Repository update receives only name, only phone, or both from validated API input | Only the corresponding whitelisted columns change; no request-derived SQL identifiers      |
| V60   | R14                | Each error category above                                                          | Error envelope, status, code and details presence match R14; no accidental HTML error page |
| V61   | R15                | GET `/docs` without following redirects, then GET `/docs/`                         | Redirect to slash URL, followed by 200 `text/html`                                         |
| V62   | R15                | Ordinary API response                                                              | No `x-powered-by`; API route remains protected by Helmet                                   |

For V42/V43, build a valid contact JSON string with additional leading spaces inside `nome`; compute byte size with UTF-8 encoding, not string length. This keeps the normalized name valid and isolates parser size behavior. Send the raw string as JSON. For PATCH, seed an existing row first. Do not rely on a huge invalid field that could fail for a different reason.

V57 is an isolated error-path verification, not an instruction to replace real persistence in the rest of the integration suite. V58 specifically checks a new read across a connection boundary so a response assembled from input cannot hide a storage/encoding defect.

## 5. Runtime, tooling and documentation verification

| Check | Requirement   | Scenario                                                                                | Evidence required                                                                                          |
| ----- | ------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| V63   | R16, D04      | Start with valid template configuration                                                 | Application boots with parsed configuration; no hidden required Docker-only variable                       |
| V64   | R16, D04      | Start with missing application variable, invalid port, unsupported mode or log level    | Clear configuration failure and process exit 1; no secret values printed                                   |
| V65   | R16           | Provision a fresh Docker volume using supplied templates                                | MySQL healthy; development and test databases accessible to `contacts` user                                |
| V66   | R16           | Follow manual MySQL instructions                                                        | Both utf8mb4 databases and user grants permit migrations and tests                                         |
| V67   | R04, R17      | Apply migrations twice with existing contact data                                       | Both runs succeed and existing data is preserved                                                           |
| V68   | R03, R18      | Import app for Supertest                                                                | No listening socket or server signal-handler side effect                                                   |
| V69   | R18           | Start real server, exercise a route, then deliver SIGINT/SIGTERM in an isolated process | Requests work before signal; HTTP server and pool close; process exits without hanging                     |
| V70   | R18           | Exercise controlled unexpected error containing input-derived SQL text                  | Sanitized error log contains no fixture name, phone, body or SQL text                                      |
| V71   | R15, R18      | Start with `npm run dev`; open `/docs/` in a browser and use Try it out                 | HTML, CSS and scripts load; create/list/update/delete work                                                 |
| V72   | R15, R17      | Build, run `npm start`; open `/docs/` and exercise the API                              | Same documentation and API behavior from `dist`; external assets resolve correctly                         |
| V73   | R19           | Run formatting, lint, comment check, typecheck and build                                | Exit 0; no warnings; compiled output excludes tests                                                        |
| V74   | R02, R19      | Inspect source and hook/config outputs                                                  | Naming, ESM, strictness, no suppressions, no forbidden dependencies, hooks and Conventional Commits comply |
| V75   | R20           | Run unit project without database/environment configuration                             | Unit suite passes without creating a pool or requiring dotenv values                                       |
| V76   | R16, R20      | Run integration project against isolated test DB                                        | Migrations run automatically, tests are sequential and isolated, resources close                           |
| V77   | R21           | Execute each ordered manual sequence below                                              | All 15 statuses match through Postman and REST Client; reproduce the same scenarios with Swagger UI        |
| V78   | R21           | Inspect OpenAPI and both collections after contract changes                             | Public names, operations and expectations stay synchronized; exact-reference limitations remain explicit   |
| V79   | R22           | GitHub Actions on final delivery commit                                                 | All reference CI steps pass with MySQL 8.4                                                                 |
| V80   | R01, R16, R22 | Follow README in a fresh clone with prerequisites installed                             | API runs in under five minutes; unit/full tests and development/build documentation checks succeed         |
| V81   | R02, R16      | Checkout and follow setup on Windows, macOS and Linux                                   | LF shell script and URL-relative assets work; record tested platforms rather than claiming untested ones   |

Source inspection is appropriate for architectural and forbidden-content rules; it must not replace HTTP, storage or browser evidence for observable behavior. A complete release report distinguishes observed platforms and scenarios from unexecuted ones.

## 6. Ordered manual request contract

Run this sequence against a clean local development database. Confirm that `999999` is absent. The first successful creation captures the actual contact ID for later requests. A new run creates its own contact rather than reusing stale IDs.

| Order | Request                                                    | Expected                                  |
| ----- | ---------------------------------------------------------- | ----------------------------------------- |
| 1     | POST valid contact: `João Silva`, `(11) 98765-4321`        | 201; `telefone` is `11987654321`; save ID |
| 2     | POST single-word name `João`, otherwise valid body         | 400 `VALIDATION_ERROR`                    |
| 3     | POST `Maria da Silva`, otherwise valid body                | 400 `VALIDATION_ERROR`                    |
| 4     | POST valid name with phone `12345`                         | 400 `VALIDATION_ERROR`                    |
| 5     | POST valid body plus unknown field                         | 400 `VALIDATION_ERROR`                    |
| 6     | POST malformed JSON                                        | 400 `INVALID_JSON`                        |
| 7     | GET all contacts                                           | 200 array                                 |
| 8     | PATCH only `nome` on captured ID, using `Ana Paula Souza`  | 200 full updated contact                  |
| 9     | PATCH only `telefone` on captured ID, using `11 3456-7890` | 200; normalized phone `1134567890`        |
| 10    | PATCH `{}` on captured ID                                  | 400 `VALIDATION_ERROR`                    |
| 11    | PATCH valid body with ID `abc`                             | 400 `VALIDATION_ERROR`                    |
| 12    | PATCH valid body with ID `999999`                          | 404 `CONTACT_NOT_FOUND`                   |
| 13    | DELETE captured ID                                         | 204 and empty body                        |
| 14    | DELETE captured ID again                                   | 404 `CONTACT_NOT_FOUND`                   |
| 15    | DELETE ID `0`                                              | 400 `VALIDATION_ERROR`                    |

Postman uses collection format v2.1, `baseUrl`, and a create-request response test that sets `contactId`. REST Client uses `@baseUrl`, `###` separators and the named `createContact` response reference. Swagger UI reproduction may require copying the returned ID into its path parameter, since no custom sequencing frontend is part of the project.

## 7. Required commands

These are future package/application commands, not commands available in the documentation-only repository at specification time.

| Command                    | Required meaning                                                |
| -------------------------- | --------------------------------------------------------------- |
| `npm run dev`              | `tsx watch src/server.ts`                                       |
| `npm run build`            | `tsc -p tsconfig.build.json`                                    |
| `npm start`                | `node dist/server.js`                                           |
| `npm run lint`             | `eslint . --max-warnings=0`                                     |
| `npm run lint:fix`         | ESLint autofix without allowing warnings                        |
| `npm run format`           | `prettier --write .`                                            |
| `npm run format:check`     | `prettier --check .`                                            |
| `npm run typecheck`        | `tsc --noEmit`                                                  |
| `npm test`                 | Full Vitest run, MySQL required                                 |
| `npm run test:unit`        | `vitest run --project unit`, no MySQL                           |
| `npm run test:integration` | `vitest run --project integration`                              |
| `npm run test:coverage`    | Coverage report for the configured test projects                |
| `npm run db:migrate`       | `tsx src/database/migrate.ts`                                   |
| `docker compose up -d`     | Start local MySQL                                               |
| `docker compose down -v`   | Destructive explicit database reset, never routine verification |

The local/CI source-comment check from RULES must find no matches in `src` or `tests`:

```sh
grep -rnE "(^|\s)//|/\*" src tests
```

A no-match grep normally exits 1. The CI reference negates the check to make no matches a successful step; do not reinterpret this as a failed source check. Do not add literal comment-like strings to source/tests that make the mandated check fail.

## 8. README contract and fresh-clone smoke

README sections must appear in this order:

1. Requirements: Node 22+, npm, Docker or MySQL 8, with the actual project database version 8.4 stated clearly.
2. Docker quick start: at most five commands, starting with `cp .env.example .env`; explain the PowerShell alternative and waiting for MySQL health.
3. Manual MySQL setup: exact PRD section 11.3 SQL.
4. Environment variables table.
5. Running: development, build and start.
6. Automated tests: unit, integration and coverage.
7. Manual testing: Swagger first at `http://localhost:3000/docs`, then Postman, REST Client and curl examples with sample responses.
8. Design decisions: every row of PRD section 9, without replacing its rationale with unstated behavior.
9. Available scripts.
10. Troubleshooting: port 3306 conflict and aligned port variables, explicitly destructive reset, and blank docs/server/slash checks.

The five-command Docker quick start is:

```sh
cp .env.example .env
docker compose up -d
npm ci
npm run db:migrate
npm run dev
```

Between database startup and migration, explain how to observe readiness without disguising another mandatory command. Test and build commands belong to their own README sections rather than inflating the quick start. Dependency installation can overlap database startup.

In a genuinely fresh clone, follow those instructions literally. Open Swagger in a browser, use all four operations, execute both collections, run `npm test`, then stop development before starting the built server on the same port. Run `npm run build && npm start` and repeat the documentation smoke. Record outcomes and prerequisites; do not claim the five-minute target without measuring the actual setup scenario.

## 9. Source-to-spec coverage

| Source section                                     | Design coverage                          | Acceptance evidence                                                                                                                     |
| -------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| PRD 1–3: overview, goals, non-goals                | R01                                      | V36–V56, V80                                                                                                                            |
| PRD 4: stack                                       | R02                                      | V63–V81, tooling/source review                                                                                                          |
| PRD 5: data model                                  | R04                                      | V36, V37, V45, V58, V59, V67                                                                                                            |
| PRD 6: HTTP contract                               | R09–R15                                  | V36–V62                                                                                                                                 |
| PRD 7: validation                                  | R05–R09                                  | V01–V25, V38–V43, V48–V53                                                                                                               |
| PRD 8: errors                                      | R14                                      | V25, V38–V42, V49–V60                                                                                                                   |
| PRD 9: assessment decisions                        | R01, R02, R04–R08, R12, R13, R15, R16    | V05, V06, V12, V21–V23, V37, V46, V54; README decision section review                                                                   |
| PRD 10: non-functional requirements                | R04, R15–R20                             | V58, V63–V76, V81                                                                                                                       |
| PRD 11: environment and migration                  | R16, R17                                 | V63–V67, V76, V80                                                                                                                       |
| PRD 12: manual tooling                             | R21                                      | V77, V78; section 6 sequence                                                                                                            |
| PRD 13: acceptance criteria                        | R05–R22                                  | Sections 2–8 and release checklist                                                                                                      |
| PRD 14: deliverables                               | R16–R22                                  | README contract, required commands, release checklist                                                                                   |
| PRD 15: delivery process                           | R22                                      | Release checklist and email-format prerequisite                                                                                         |
| PRD 16: three-day sequence                         | R22; AGENT implementation ordering       | Future plan groups foundation/infrastructure, contacts, documentation/delivery in that order; no promise of a deadline absent the email |
| RULES 1–4: language, comments, naming, TypeScript  | R02, R03, R19                            | V73, V74; source review against the exact conventions                                                                                   |
| RULES 5–6: architecture and style                  | R03, R19                                 | V26–V35, V68, V73, V74                                                                                                                  |
| RULES 7–10: validation, errors, SQL, HTTP          | R04–R15                                  | V01–V62                                                                                                                                 |
| RULES 11–13: docs, logging, environment            | R15, R16, R18, R21                       | V61–V65, V69–V72, V77, V78                                                                                                              |
| RULES 14: testing                                  | R20                                      | V75, V76; sections 1–4                                                                                                                  |
| RULES 15–18: tooling, Git, forbidden items, review | R19, R22                                 | V73, V74, V79; release checklist                                                                                                        |
| AGENT workflow and execution phases                | R03, R19, R22                            | Future implementation tasks follow the authoritative 24-step order, with behavior and quality evidence per task                         |
| AGENT commands, done and delivery checklist        | R20–R22                                  | Sections 7–10                                                                                                                           |
| AGENT hard stops and exact-reference appendix      | Sections 1 and 5 of design, R15–R17, R22 | Reference fidelity review; source conflicts stop implementation rather than silently changing templates                                 |

Every requirement has at least one acceptance route. Where a source imposes source-code conventions rather than runtime behavior, its evidence is source/tooling review rather than a contrived HTTP test.

## 10. Release checklist

These unchecked items belong to future implementation/delivery, not the current documentation task.

- [ ] Design and acceptance annex reviewed; proposed conventions accepted or revised.
- [ ] Implementation plan references both specification files and preserves source authority.
- [ ] All endpoint, schema, service, persistence, error and precedence acceptance cases pass.
- [ ] Formatting, lint, comment check, typecheck, build and full tests pass with zero warnings.
- [ ] Unit tests pass independently of MySQL and runtime environment configuration.
- [ ] OpenAPI and both request collections match the API, within the explicitly documented limitations of the supplied exact OpenAPI reference.
- [ ] `/docs/` and its assets work in a real browser from both development and compiled startup; all four operations exercised.
- [ ] README satisfies the section order, five-command quick start, manual setup, examples, decisions and troubleshooting contract.
- [ ] Fresh clone followed literally; setup time and actual smoke/test outcomes recorded.
- [ ] `.env.example`, `.env.test`, Compose, init shell script, SQL migration, npm lockfile, request tools and CI workflow are versioned.
- [ ] `.env`, dependencies, build and coverage artifacts excluded; `git log --all -- .env` returns no entries.
- [ ] Commit history uses atomic Conventional Commits; dates have not been rewritten.
- [ ] Latest delivery commit has green GitHub Actions.
- [ ] GitHub repository has a one-line About description.
- [ ] Original assessment email checked for exact format, recipient/access requirements and deadline.
- [ ] Appropriate delivery artifact prepared: public GitHub link, ZIP via `git archive -o contacts-api.zip HEAD`, or private repository access, as requested by that email.
- [ ] Final version identified by `v1.0.0`; tag/push and any publication or access grants performed only with delivery authorization.
- [ ] Original email thread answered with the required artifact/link, stack summary, design-decisions reference and local `/docs` URL; clarify that localhost is local evaluator tooling, not a deployed service.
- [ ] Delivery completed before the actual deadline; no subsequent pushes to main. Any discovered post-delivery bug is reported by email instead.

### Evidence boundary

At the end of the specification-writing task, only documentation integrity can be checked: source coverage, consistent identifiers, links, reviewable conventions and absence of unfilled sections. No application tests, browser runtime, MySQL provisioning, builds, hooks, CI, publication or assessment delivery are claimed by these documents.
