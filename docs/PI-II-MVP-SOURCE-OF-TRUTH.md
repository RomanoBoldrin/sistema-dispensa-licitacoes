# PI-II --- Sistema de Dispensa de Licitações

## MVP Functional Specification and Implementation Roadmap

> **Document purpose:** This document is the working source of truth for
> AI agents and developers contributing to the PI-II project. It
> describes the intended MVP, the requirements captured in the project
> documentation, the implementation baseline reported by the project
> owner, the current Prisma data model, known gaps, architectural
> decisions, and the recommended implementation sequence.
>
> **Last updated:** 2026-11-05\
> **Project:** `sistema-dispensa-licitacoes-js`\
> **Status:** Phase 0 (Audit & Alignment), Phase 1 (Process Foundation), Phase 2 (Procurement Preparation), and Phase 3 (Legal Classification, Justifications & Submission Workflow) are completed and verified (20/20 test suites passed, 185/185 tests passed). Next priority is Phase 4 (Internal Analysis and Approval Workflow).

---

## 1. Instructions for AI agents

Before changing the project:

1.  Read this document and the repository's existing documentation:
    - `docs/API-ARCHITECTURE.md`
    - `docs/DESIGN.md`
    - `docs/DOMAIN_GLOSSARY.md`
    - `docs/PHASE-1-DOMAIN.md`
    - `docs/PHASE-2-REQUIREMENTS.md`
2.  Inspect the current source code and Prisma schema. This document
    describes the known baseline as of 2026-11-04; the repository may
    have changed since then.
3.  Prefer extending existing conventions and abstractions over
    introducing parallel implementations.
4.  Do not assume that a feature exists merely because a Prisma model or
    enum exists. A model is data-model support, not proof of a working
    API, UI, authorization rule, or tested workflow.
5.  Do not assume that a feature is absent solely because it was not
    visible in the supplied project tree. Search the repository before
    implementing it.
6.  Preserve the current stack and architecture unless a concrete
    technical reason justifies a change.
7.  Implement complete vertical slices: database changes (when needed),
    domain rules, API, authorization, UI, tests, and documentation.
8.  Do not make destructive database changes or edit production
    environment configuration without explicit authorization.
9.  Never expose `.env` values, credentials, tokens, or secrets in
    generated documentation, logs, tests, or responses.
10. Treat the project-specific workflow documents and this specification
    as the source of functional requirements. Where this document labels
    something as a recommendation or open decision, do not silently turn
    it into a confirmed requirement.

### Evidence labels used in this document

- **Confirmed requirement:** explicitly present in the supplied PI-II
  documentation.
- **Confirmed baseline:** visible in the supplied `schema.prisma`,
  `package.json`, or project tree.
- **Reported history:** discussed by the project owner in previous
  development conversations, but not re-verified against the current
  source code in this session.
- **Recommendation:** proposed implementation guidance, not an
  existing requirement.
- **Open decision:** requires confirmation from the project owner or
  further project documentation.

---

## 2. Project objective and MVP outcome

The project is a web application to simulate and support the
administrative workflow of a Brazilian direct-award procurement process
(_dispensa de licitação_), from the formalization of a demand through
internal analysis, authorization, publication, and public consultation.

The MVP should allow the institution's users to:

1.  Authenticate and access functionality according to their roles and
    organizational department.
2.  Create and maintain a procurement process.
3.  Formalize the demand associated with the process (DFD).
4.  classify the legal basis/hypothesis for the direct award and perform
    basic validations.
5.  Attach and organize process documents.
6.  Register supplier quotations and produce a comparative price map.
7.  Record the price and supplier-selection justifications.
8.  Submit the process for internal analysis.
9.  Let authorized staff analyze, approve, return for adjustments, or
    reject/close a process.
10. Record the process history and relevant audit events.
11. Generate a publication extract, record publication evidence, and
    expose public information.
12. Provide administrative management of users, profiles, and relevant
    parameters.

The supplied documentation also mentions reports and
workflow/document/legal configuration in the screen-flow description.
Their exact depth in the MVP should be prioritized after the end-to-end
workflow is functional.

### MVP completion criterion

The MVP is not complete when individual pages exist. It is complete when
a user can take a process through the intended lifecycle, with
server-enforced permissions and validations, persisted data, traceable
decisions, and appropriate public disclosure.

At minimum, an end-to-end acceptance scenario should be executable:

`Requester creates process → fills required information → attaches documents → records price research → adds justifications → submits → internal staff analyzes → process is approved or returned/rejected → approved process is published → public user can consult disclosed information → history/audit reflects the actions.`

---

## 3. Source requirements: modules and screens

The original PI-II documentation supplied for this planning session
consisted of:

- `tela principal.txt`
- `Fluxo do requisitante.txt`
- `Fluxo dde analise interna.txt`
- `Fluxo de publicacao. txt.txt`
- `fluxo das telas.txt`
- `Estrutura.xlsx`
- `fluxo_visual.jpeg`

The source files describe the following modules.

---

Module Requirement captured in the source
documentation

---

Authentication and profiles Login, access levels, password
recovery, permissions by department

Procurement process Create, number, and track the
administrative process

Document instruction Receive and organize mandatory
process documents

Legal classification Define the legal hypothesis for the
direct award and validate a legal
checklist

Price research Register quotations and suppliers
and produce a comparative map

Approvals Route the process for opinions,
authorization, and internal
approval

Publication Generate an extract, make it
available on the internal/public
portal, and prepare PNCP
publication/submission

Audit Preserve history of actions, users,
dates, and versions

Transparency Allow public consultation of
disclosable acts
-----------------------------------------------------------------------

### 3.1 Main screens

The screen specification names these screens:

- Login
- Dashboard
- New Dispensa
- Initial data
- Legal classification
- Documents
- Price research
- Justifications
- Process summary
- Process detail
- Approvals
- Publication
- Public consultation
- Administration

The detailed screen-flow document additionally describes:

- Process list with filters by status, department/secretariat, and
  period.
- Process detail tabs: General data, Documents, Price research,
  Justifications, Workflow, Opinions, Publication, and History/Audit.
- Approval inbox.
- Reports:
  - Dispensas by period
  - Dispensas by secretariat/department
  - Values by supplier
  - Pending items and deadlines
- Administration:
  - Users
  - Profiles and permissions
  - Document types
  - Legal hypotheses
  - Workflow configuration
  - System logs

The source documentation names these screens and capabilities, but does
not specify every field, validation, permission, or calculation. Those
details must be designed consistently with the domain and confirmed
where legally or institutionally significant.

---

## 4. Required business workflows

### 4.1 Requester workflow

The supplied requester workflow is:

1.  Dashboard
2.  New Dispensa
3.  Initial data
4.  Legal classification
5.  Attach documents
6.  Price research
7.  Contracting justification
8.  Summary
9.  Submit for analysis

The initial-data screen is described as collecting the object,
department/sector, estimated value, and initial justification.

The legal-classification screen selects a hypothesis under Article 75
and performs a basic rule validation.

The documents screen attaches the required process files.

The price-research screen registers quotations and displays a
comparative map.

The justifications screen formalizes the price justification and
supplier-selection justification.

The summary screen lets the requester review the information before
submission.

### 4.2 Internal analysis workflow

The supplied internal-analysis workflow is:

1.  Approval inbox
2.  Process detail
3.  Decision:
    - **Request adjustment:** return the process to the requester.
    - **Approve stage:** forward it to the next stage.
    - **Reject/close:** end the process.

The process detail should provide the information needed for analysis.
The source screen flow names tabs for general data, documents, price
research, justifications, workflow, opinions, publication, and
history/audit.

The exact internal stages, responsible roles, whether approvals are
sequential or parallel, and the meaning of rejection versus closure
remain open design decisions unless already specified in repository
documentation.

### 4.3 Publication workflow

The supplied publication workflow is:

1.  Receive an approved process.
2.  Open the publication screen.
3.  Generate the publication extract.
4.  Publish process information on the public portal.
5.  Prepare PNCP integration/publication.
6.  Save the publication receipt/evidence.
7.  Make the relevant information available through public consultation.

The source documentation says to prepare PNCP integration; it does not,
by itself, establish that a live PNCP API integration is mandatory for
the first MVP. This must be decided explicitly.

### 4.4 Public consultation

The public consultation screen should allow a public visitor to search
for a process and view the information that is intended to be public.

The supplied documentation does not define the precise public fields,
search filters, or file-disclosure rules. The implementation must not
expose internal notes, credentials, personal data, restricted documents,
or internal-only opinions merely because they are associated with a
process.

---

## 5. Current project baseline

This section records the project structure and dependencies supplied by
the project owner on 2026-11-04. It is a snapshot, not a guarantee that
the working tree has not changed.

### 5.1 Technology stack

From `package.json`:

- Next.js `16.3.0`
- React / React DOM `19.2.8`
- JavaScript (the supplied tree uses `.js`, `.jsx`, and `.mjs`)
- Prisma / Prisma Client `7.9.1`
- PostgreSQL
- `@prisma/adapter-pg`
- Jest `30.4.2`
- Tailwind CSS 4
- `next-connect`
- `bcryptjs`
- `nodemailer`
- `cookie`
- `uuid`

The project uses the Next.js **Pages Router** (`src/pages`), including
API routes under `src/pages/api/v1`.

### 5.2 Relevant scripts

The supplied `package.json` includes:

- `npm run dev`
- `npm run dev:test`
- `npm test`
- `npm run test:watch`
- `npm run test:dev`
- `npm run test:ci`
- `npm run build`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:migrate:deploy`
- `npm run db:push`
- `npm run db:studio`
- `npm run lint:prettier:check`
- `npm run lint:eslint:check`
- `npm run db:seed:admin:dev`
- Docker compose scripts for development and tests

Use the project's scripts rather than inventing alternate commands.
Verify the current `package.json` before relying on a script.

### 5.3 Supplied project tree

The supplied tree shows:

```text
sistema-dispensa-licitacoes-js/
├── docs/
│   ├── API-ARCHITECTURE.md
│   ├── DESIGN.md
│   ├── DOMAIN_GLOSSARY.md
│   ├── GIT_CONVENTIONS.md
│   ├── PHASE-1-DOMAIN.md
│   └── PHASE-2-REQUIREMENTS.md
├── prisma/
│   ├── migrations/
│   │   ├── 20260817014557_init/
│   │   ├── 20260830191811_add_sessions/
│   │   ├── 20260912002822_password_reset/
│   │   └── 20260925000000_add_demand_document/
│   └── schema.prisma
└── src/
    ├── components/
    │   ├── auth/
    │   ├── demand-formalization/
    │   └── home/
    ├── infra/
    ├── pages/
    │   ├── api/v1/
    │   │   ├── auth/
    │   │   ├── status/
    │   │   ├── user/
    │   │   └── users/
    │   ├── dashboard/
    │   ├── forgot-password/
    │   ├── login/
    │   ├── processes/new.js
    │   └── reset-password/
    ├── scripts/seed-admin.mjs
    └── tests/
        ├── infra/
        ├── integration/
        └── orchestrator/
```

Notable files in the supplied tree:

- `src/components/demand-formalization/DemandFormalizationWizard.jsx.jsx`
- `src/pages/processes/new.js`
- `src/pages/dashboard/index.js`
- `src/infra/authentication.js`
- `src/infra/controller.js`
- `src/infra/errors.js`
- `src/infra/prisma.js`
- `src/infra/session.js`
- `src/infra/email.js`

The doubled `.jsx.jsx` suffix is a naming issue worth correcting when
the component is next touched, while updating imports and tests safely.

### 5.4 API routes visible in the supplied tree

The supplied tree shows these API routes:

```text
/api/v1/auth/forgot-password
/api/v1/auth/reset-password
/api/v1/auth/sessions
/api/v1/status
/api/v1/user
/api/v1/users
/api/v1/users/[username]
```

No process, supplier, quotation, document, approval, publication,
reporting, or public-consultation API route appeared in the supplied
tree. Agents must search the current repository before treating any of
these as definitely unimplemented.

### 5.5 Reported implementation history

Previous project conversations reported work on:

- Email-based login and server-side sessions.
- Password recovery and reset tokens.
- Admin-provisioned user accounts; public self-registration was not
  the intended approach.
- New users initially assigned the `SOLICITANTE` role.
- A dashboard using real data through `/api/v1/dashboard`.
- Demand formalization / DFD functionality and a dedicated endpoint
  under development.
- A category set for demand objects:
  - `COMMON_GOODS`
  - `ENGINEERING_WORKS`
  - `GENERAL_SERVICES`
  - `IT_GOODS`
  - `HEALTH_SUPPLIES`
  - `OTHER`
- PostgreSQL and Prisma 7.9.
- Jest and database-backed integration-test infrastructure.
- A prior issue where the application and test execution were using
  different databases.

These are **reported history**, not independently verified against the
supplied tree. In particular, `/api/v1/dashboard` and a DFD API endpoint
were not visible in the tree excerpt supplied on 2026-11-04. Verify the
current repository and environment configuration before relying on them.

### 5.6 Verified Repository Audit & Phase 1 Implementation (2026-11-04)

During Phase 0 and Phase 1 execution on 2026-11-04, the live repository was audited and updated as follows:

- **Resolved Documentation Alignment (`docs/API-ARCHITECTURE.md`)**: `docs/API-ARCHITECTURE.md` previously contained conceptual TypeScript examples and unversioned `/api/processes` paths, whereas the live codebase uses JavaScript (ES Modules), `next-connect` with centralized `src/infra/controller.js` error handlers, and versioned `/api/v1/...` routes. `docs/API-ARCHITECTURE.md` was updated to reflect the actual JavaScript + `next-connect` + `/api/v1/` + `src/services/` architecture.
- **Verified Pre-existing Features**:
  - `src/components/demand-formalization/DemandFormalizationWizard.jsx` had already been renamed cleanly from `.jsx.jsx`.
  - `/api/v1/dashboard` (`src/pages/api/v1/dashboard/index.js`) and its UI (`src/pages/dashboard/index.js`) were already implemented and querying real database metrics.
  - `POST /api/v1/processes` (`src/pages/api/v1/processes/index.js`) and `src/tests/integration/api/v1/processes/post.test.js` were present for initial process + DFD creation.
- **Completed Phase 1 Deliverables**:
  - **Domain Service Layer**: Created `src/services/process.service.js` (`createProcess`, `listProcesses`, `getProcessById`, `updateProcess`, `canUserAccessProcess`, `canUserEditProcess`, `isValidUuid`) to keep API route handlers thin and enforce all business rules server-side.
  - **Process Creation (`POST /api/v1/processes`)**: Added support for optional initial `estimatedValue` and `legalBasis`, department authorization (`SOLICITANTE` and `AGENTE_CONTRATACAO` restricted to their own department; `ADMIN` allowed to specify a target `departmentId` or fall back to their own), concurrency-safe `(number, year)` generation via PostgreSQL `pg_advisory_xact_lock`, and atomic creation of `Process` (`DRAFT`), `DemandDocument` (DFD), and `AuditLog` (`PROCESS_CREATED` and `DEMAND_DOCUMENT_CREATED`).
  - **Process Listing (`GET /api/v1/processes` & `/processes`)**: Implemented role/ownership scoping (`SOLICITANTE` restricted to own processes and forbidden from querying other departments), server-side filtering (`status`, `departmentId`, `year`, `createdFrom`, `createdTo`, `search`), pagination (`page`, `pageSize`, `meta`), and the `/processes` UI page (`src/pages/processes/index.js`).
  - **Process Detail & Draft Editing (`GET` & `PATCH /api/v1/processes/[processId]` & `/processes/[processId]`)**: Implemented explicit Prisma `select` projections (never exposing `passwordHash`, sessions, or reset tokens), `DRAFT`-only editing (`409 ConflictError` via `src/infra/errors.js` otherwise), rejection of protected fields (`status`, `number`, `year`, `requesterId`, `departmentId`, etc.) with `400 ValidationError`, atomic `Process` and `DemandDocument` updates (`PROCESS_UPDATED`, `DEMAND_DOCUMENT_UPDATED`), and the `/processes/[processId]` detail/edit UI (`src/pages/processes/[processId]/index.js`).
  - **Wizard & Dashboard Integration**: Updated `src/components/demand-formalization/DemandFormalizationWizard.jsx`, `src/pages/processes/new.js`, `src/components/dashboard/DashboardSidebar.jsx`, `src/components/dashboard/RecentProcessesTable.jsx`, and `src/components/dashboard/DashboardOverview.jsx` so navigation between Dashboard, Process Listing (`/processes`), Process Creation (`/processes/new`), and Process Detail (`/processes/[processId]`) is fully connected.
  - **Automated Tests**: Added unit tests (`src/tests/unit/processService.test.js`, `src/tests/unit/dashboardUtils.test.js`) and integration tests (`src/tests/integration/api/v1/processes/get.test.js`, `src/tests/integration/api/v1/processes/[processId]/get-and-patch.test.js`, and concurrent creation tests in `src/tests/integration/api/v1/processes/post.test.js`).

---

## 6. Current Prisma data model

The supplied `schema.prisma` contains the following enums and models.

### 6.1 Enums

- `UserRole`: `ADMIN`, `SOLICITANTE`, `AGENTE_CONTRATACAO`,
  `APROVADOR`
- `ProcessStatus`: `DRAFT`, `IN_ANALYSIS`, `PRICE_RESEARCH`,
  `SUPPLIER_SELECTED`, `AWAITING_APPROVAL`, `REJECTED`, `APPROVED`,
  `COMPLETED`
- `ApprovalDecision`: `APPROVED`, `REJECTED`
- `DocumentType`: `PESQUISA_PRECOS`, `JUSTIFICATIVA_PRECO`,
  `RAZAO_ESCOLHA_FORNECEDOR`, `DOCUMENTACAO_FORNECEDOR`,
  `PARECER_JURIDICO`, `TERMO_REFERENCIA`, `OUTRO`
- `ObjectCategory`: `COMMON_GOODS`, `ENGINEERING_WORKS`,
  `GENERAL_SERVICES`, `IT_GOODS`, `HEALTH_SUPPLIES`, `OTHER`
- `UrgencyLevel`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `AuditAction`: `PROCESS_CREATED`, `PROCESS_UPDATED`,
  `PROCESS_SUBMITTED`, `DEMAND_DOCUMENT_CREATED`,
  `DEMAND_DOCUMENT_UPDATED`, `QUOTATION_ADDED`, `QUOTATION_UPDATED`,
  `SUPPLIER_SELECTED`, `DOCUMENT_UPLOADED`,
  `PROCESS_SENT_FOR_APPROVAL`, `PROCESS_APPROVED`, `PROCESS_REJECTED`,
  `PROCESS_COMPLETED`

### 6.2 Models

---

Model Current responsibility and key
fields

---

`User` Identity, email, password hash,
role, active flag, optional
department; relations to created
processes, uploaded documents,
approvals, audit logs, sessions,
and reset tokens

`PasswordResetToken` Unique token, user, expiry, used
timestamp

`Session` Session ID, token hash, user,
expiry and timestamps

`Department` Unique name; users and processes

`Process` Number/year, title, object,
description, optional legal basis
and estimated value, status,
department, requester, quotations,
documents, approvals, audit logs,
optional DFD, selected supplier and
supplier justification

`DemandDocument` One-to-one with process; category,
detailed justification, technical
specifications, urgency, budget
source, desired deadline,
responsible name/email

`Supplier` Legal/trade name, unique CNPJ,
email, phone, quotations, selected
processes

`Quotation` Process, supplier, optional
description, one decimal value,
optional quotation date

`Document` Process, active flag, type,
filename, storage key, MIME type,
size, uploader, creation/deletion
timestamps

`Approval` Process, user, required decision
(`APPROVED` or `REJECTED`),
optional comment, creation/deletion
timestamps

`AuditLog` Process, user, action, optional
description, creation/deletion
timestamps
-----------------------------------------------------------------------

### 6.3 Strengths of the existing model

- `Process` is already the central domain entity.
- Processes have a unique human-readable number/year pair.
- Department and requester ownership are represented explicitly.
- The DFD is represented as a one-to-one `DemandDocument`.
- Supplier records are reusable across processes.
- Quotations connect suppliers and processes.
- Documents have a storage key rather than requiring file bytes in
  PostgreSQL.
- Approval and audit records are associated with processes and users.
- Dashboard-oriented indexes exist for process status, department,
  requester, and creation time.
- Sessions and password-reset tokens are represented separately from
  user credentials.

### 6.4 Important model limitations to assess

These are design observations about the supplied schema, not proof that
every suggested change is required. Check the existing requirements docs
and application code before changing the schema.

#### A. Process status and workflow

`ProcessStatus` combines lifecycle and work-stage concepts. It currently
has no explicit status for "returned for adjustments", "awaiting legal
opinion", "awaiting authorization", or "published".

The internal workflow requires at least the ability to request
adjustments, approve a stage and forward the process, or reject/close
it.

**Recommendation:** Keep the current enum until the workflow is
specified. Design the allowed state transitions explicitly in a domain
service. Add states only when they correspond to real workflow
requirements. Do not allow the frontend to set arbitrary statuses.

A separate process-transition/history model may be useful if the
existing `AuditLog` is not sufficient to represent
from-status/to-status, comments, and transition chronology.

#### B. Item-level price research

The `Quotation` model stores one `value` for a supplier's quotation on a
process.

**Decision implemented (Phase 2):** For this MVP, one `Process` represents
one indivisible procurement object with one overall estimated value (`Process.estimatedValue`).
Quotations represent total supplier bids (`Quotation.value`), and price comparison
is conducted at the overall process level. `ProcessItem` and `QuotationItem` were
deliberately not introduced to keep the MVP focused and avoid premature complexity.
Decimal precision is strictly maintained using exact cents arithmetic and `Prisma.Decimal`.

**Recommendation if multi-item procurement is introduced in a future version:**
introduce `ProcessItem` and `QuotationItem`, where each quotation item references
a specific process item with quantity and unit price.

#### C. Approval assignment and stage

The current `Approval` requires a decision at record creation and has no
stage or pending state. That is insufficient if the system needs to
create an approval task before the reviewer acts.

**Recommendation:** If approval assignments are needed, distinguish an
assigned/pending review from its final decision, and identify the
approval stage or workflow step. The final stages and whether they are
sequential, parallel, or hybrid remain open decisions.

#### D. Document storage, validation, and deactivation

**Implemented Strategy (Phase 2):**

- Documents are stored outside PostgreSQL via `storageService` (`src/services/storage.service.js`).
- Database records in `Document` store metadata, MIME type, size, process relation, and safe generated keys (`doc_<uuid>.<ext>`), preventing path traversal attacks.
- Magic-byte signatures are checked server-side to prevent MIME-type spoofing (PDF `%PDF-`, PNG, JPEG, DOCX, XLSX, ODT, TXT).
- Files up to 15MB are accepted. Downloads are authorized server-side and streamed to the client with sanitized `Content-Disposition`.
- Deactivation uses soft deletion (`isActive = false`), and transactional rollback removes disk files if database records fail to commit.

#### E. Legal classification

`Process.legalBasis` is currently a nullable string. The requirements
describe selecting an Article 75 hypothesis and validating a basic legal
rule/checklist.

**Recommendation:** Define a structured representation for the legal
framework/article/hypothesis and validation result once the exact legal
options and checklist are confirmed. Keep legal rule logic out of
arbitrary frontend conditionals and avoid hardcoding assumptions that
may become outdated. Legal rules and thresholds must be verified against
authoritative, current sources before implementation.

#### F. Audit trail

`AuditLog` has action, description, user, process, and timestamps. It
currently also has `deletedAt`.

**Recommendation:** Treat audit records as append-only from the
application perspective. Avoid ordinary edit/delete operations for audit
events. Record meaningful actor, entity, action, timestamp, and relevant
before/after data where appropriate. Write the business change and audit
event in the same database transaction. Consider whether system-level
events without a process association must also be recorded.

#### G. Publication evidence

The current schema does not visibly contain publication records,
publication timestamps, publication status, generated extract metadata,
or PNCP receipt/protocol information.

**Recommendation:** Add a publication model only after defining what the
MVP must record (portal publication, PNCP preparation/submission,
receipt/evidence, timestamps, public URL, and status). Keep internal
publication preparation distinct from a confirmed external publication.

#### H. Process numbering

`Process` has `number`, `year`, and a unique constraint on
`[number, year]`.

**Recommendation:** Implement safe number allocation on the server,
handling concurrent creation. Do not generate numbers solely in the
browser or use a read-then-write sequence without concurrency
protection.

**Implemented Strategy (Phase 1):**

- Numbering is generated exclusively on the server inside `processService.createProcess` (`src/services/process.service.js`).
- Inside an interactive Prisma database transaction (`prisma.$transaction`), a transaction-scoped PostgreSQL advisory lock (`SELECT pg_advisory_xact_lock(424242, currentYear)`) serializes concurrent creations within the same calendar year without blocking unrelated years.
- While holding the advisory lock, the service queries `max(number)` for `year = currentYear` and assigns `nextNumber = (lastNumber ?? 0) + 1`, creating the `Process`, its `DemandDocument`, and its `AuditLog` entries (`PROCESS_CREATED` and `DEMAND_DOCUMENT_CREATED`) atomically.
- As defense-in-depth against unique constraint collisions (`P2002` on `[number, year]`), the transaction is wrapped in a bounded retry loop (up to 3 attempts).

---

## 7. Roles and access-control baseline

The supplied schema defines four roles:

---

Role Intended high-level responsibility
(to validate against existing
docs/code)

---

`ADMIN` Manage users and system
administration

`SOLICITANTE` Create and maintain own/authorized
department demands and processes

`AGENTE_CONTRATACAO` Conduct procurement-process
analysis and preparation

`APROVADOR` Perform assigned
approvals/authorizations
-----------------------------------------------------------------------

The schema supports a user's optional department and links processes to
a required department and requester.

The source documentation requires access levels and permissions by
department. It does not fully define the permission matrix.

**Required implementation principle:** authorization must be enforced
server-side on every protected API operation. Hiding a button in the UI
is not authorization.

Before implementing each endpoint, define: - Which roles can perform the
action. - Whether the user must belong to the process department. -
Whether the requester may edit a process after submission. - Who can
return, reject, approve, authorize, publish, or reopen a process. -
Which actions are public and which require authentication. - Whether
administrators can act on behalf of another role and how that is
audited.

Public consultation should use a separate, explicit public data
projection rather than returning the internal `Process` object
wholesale.

---

## 8. Recommended application architecture

Retain the current Next.js Pages Router, JavaScript, API route
conventions, and Prisma infrastructure.

Recommended responsibility boundaries:

1.  **Pages and React components:** presentation, forms, navigation,
    client-side interaction.
2.  **API route/controller layer:** HTTP method handling, request
    parsing, response status and serialization.
3.  **Authentication/authorization layer:** session validation, role
    checks, department/process access checks.
4.  **Domain services:** business rules, workflow transitions, process
    submission, approval, supplier selection, publication.
5.  **Persistence layer:** Prisma queries and transactions.
6.  **Infrastructure:** database client, email, file storage, error
    handling, and other integrations.

Domain operations should not be implemented as arbitrary Prisma updates
in frontend components. For example, approving a process should be a
server-side operation that validates the current state, actor
permissions, required data/documents, and workflow rules, then updates
the process and writes history/audit events atomically.

Follow `docs/API-ARCHITECTURE.md`, `docs/DESIGN.md`, and existing
patterns before creating new layers or naming conventions.

### Suggested API resource areas

These are a proposed target organization, not existing routes:

```text
/api/v1/
├── auth/
├── users/
├── departments/
├── dashboard/
├── processes/
│   └── [processId]/
│       ├── demand-document/
│       ├── items/
│       ├── documents/
│       ├── quotations/
│       ├── justifications/
│       ├── submit/
│       ├── history/
│       └── ...
├── suppliers/
├── approvals/
├── publications/
├── public/
└── reports/
```

Prefer resource-oriented endpoints and domain actions where appropriate.
Do not create every proposed route in advance; implement only the
endpoints needed by a vertical slice.

---

## 9. Implementation roadmap

The following roadmap orders work by dependency and by the need to
demonstrate a complete end-to-end MVP.

### Phase 0 --- Repository audit and alignment

**Goal:** establish the actual current implementation before changing
it.

Tasks: - \[x\] Read all existing project documentation under `docs/`. -
\[x\] Inspect the current Prisma schema and migration history. - \[x\]
Inspect all API routes and identify their methods, authentication,
validation, and response contracts. - \[x\] Inspect the existing DFD
wizard and its API integration. - \[x\] Inspect dashboard data sources
and filters. - \[x\] Inspect authentication, session, role, and
department authorization. - \[x\] Run existing tests and record baseline
results. - \[x\] Verify development and test databases are distinct and
correctly configured. - \[x\] Identify implemented features versus
model-only support versus missing features. - \[x\] Confirm the open
decisions in Section 11.

**Exit criterion:** a verified implementation inventory and no
unresolved uncertainty about the existing process/DFD flow that would
cause duplicate implementation.

### Phase 1 --- Process foundation

**Goal:** make a requester able to create, save, list, view, and update
a process safely.

Tasks: - \[x\] Implement process creation and safe number/year
allocation. - \[x\] Validate required initial data (title/object,
department, requester, estimated value and initial justification as
specified). - \[x\] Associate process with the authenticated requester
and authorized department. - \[x\] Implement process listing. - \[x\]
Implement filtering by status, department/secretariat, and period. - \[x\]
Implement process detail. - \[x\] Implement edit rules based on
status and permissions. - \[x\] Integrate the existing DFD
(`DemandDocument`) with process creation/detail. - \[x\] Implement the
process creation/detail UI. - \[x\] Ensure dashboard links and counts
use real, authorized data. - \[x\] Add API integration tests and
authorization tests.

**Exit criterion:** an authorized requester can create and maintain a
draft process with its DFD, and authorized users can list/view processes
according to permissions.

### Phase 2 --- Procurement preparation

**Goal:** complete the process instruction data needed before submission.

Tasks:

- [x] Confirm whether processes support one object or multiple items (single-object scope confirmed for MVP).
- [x] Implement supplier CRUD/lookup with CNPJ validation, check digits, normalization, and duplicate handling (`supplier.service.js`).
- [x] Implement quotation registration, retrieval, editing, and deletion with decimal precision and process status locking (`quotation.service.js`).
- [x] Implement comparative price map calculation rules (lowest price, variance, average) in domain service (`buildComparativePriceMap`).
- [x] Implement document upload, metadata persistence, outside-PostgreSQL storage, safe storage keys, and authorized streaming download (`storage.service.js`, `document.service.js`).
- [x] Validate file size (15MB), magic byte signatures, allowed extensions, and path traversal defenses.
- [x] Implement document categories matching `DocumentType` enum and procurement checklist.
- [x] Enforce database uniqueness constraint on `Quotation(processId, supplierId)`.
- [x] Add document deactivation (`Document.isActive`).
- [x] Integrate Supplier, Quotation, Comparative Price Map, and Document tabs into Process Detail UI (`/processes/[processId]`).
- [x] Add comprehensive unit and integration test suites covering all success, validation, and error scenarios.

**Exit criterion:** the process contains the required supplier/quotation and document information, produces a consistent comparative price map, and all test suites pass. Demonstrably achieved on 2026-11-04 (15/15 test suites passed, 127/127 tests passed).

### Phase 3 --- Legal classification and formalization

**Goal:** let the requester complete and submit a formally instructed
process.

Tasks:

- [x] Define the legal hypotheses and checklist from the project's approved requirements (Lei nº 14.133/2021 Article 75, Decretos nº 11.871/2023, 12.343/2024, 12.807/2025).
- [x] Implement legal classification and server-side basic validation (`src/domain/legal-classification.js`, `src/services/legal.service.js`).
- [x] Record the price justification (`priceJustification` in DB + API/UI).
- [x] Record the supplier-selection justification (`supplierJustification` in DB + API/UI).
- [x] Enforce formal supplier selection (`selectedSupplierId`) with quotation verification on the process.
- [x] Validate required fields and documents before submission (`validateProcessCompleteness` in `src/services/submission.service.js`).
- [x] Implement the process summary/review screen (`ProcessReviewTab.jsx` with 7-point readiness checklist, executive summary, and submission confirmation modal).
- [x] Implement submission as a domain operation (`submitProcess` atomically transitioning `DRAFT`/`PRICE_RESEARCH`/`SUPPLIER_SELECTED` to `AWAITING_APPROVAL`).
- [x] Prevent unauthorized or invalid edits after submission (`canEdit` false when not in draft/research states, locked on backend).
- [x] Record submission and status transition in history/audit (`AuditAction.PROCESS_SUBMITTED`, `LEGAL_CLASSIFICATION_UPDATED`, `PRICE_JUSTIFICATION_UPDATED`, `SUPPLIER_JUSTIFICATION_UPDATED`).
- [x] Add tests for valid and invalid submission scenarios (unit tests for domain rules, submission service, justifications; integration tests for `/submit` and `/legal-classification`).

**Exit criterion:** a requester can complete the documented wizard,
review the summary, and submit a valid process for internal analysis.
Demonstrably achieved on 2026-11-05 (20/20 test suites passed, 185/185 tests passed).

### Phase 4 --- Internal analysis and approval workflow

**Goal:** support the documented approval inbox and decisions.

Tasks: - \[ \] Define workflow stages and responsible roles. - \[ \]
Define sequential, parallel, or hybrid approval behavior. - \[ \] Define
pending assignment and decision data model. - \[ \] Implement approval
inbox with authorized pending processes. - \[ \] Implement process
analysis/detail view. - \[ \] Implement approve-stage action and
forwarding. - \[ \] Implement request-adjustment action and return to
requester. - \[ \] Implement rejection/closure action. - \[ \] Record
reviewer, stage, decision, comment, and timestamps. - \[ \] Enforce all
transition and authorization rules on the server. - \[ \] Record each
transition in history/audit. - \[ \] Notify relevant users if
notifications are included in the MVP. - \[ \] Add integration tests for
the full decision paths.

**Exit criterion:** an authorized reviewer can process an assigned case,
and each decision produces the correct next state, assignment,
permissions, and history.

### Phase 5 --- Authorization, publication, and transparency

**Goal:** make an approved process publishable and publicly consultable.

Tasks: - \[ \] Define the final authorization/homologation stage, if
applicable to the selected workflow. - \[ \] Implement publication
eligibility rules. - \[ \] Generate a publication extract from approved
process data. - \[ \] Implement publication records and status
tracking. - \[ \] Publish the appropriate information on the public
portal. - \[ \] Store publication evidence/receipt and timestamps. - \[
\] Define PNCP scope: simulation/preparation or live integration. - \[
\] If live integration is approved, implement it behind a dedicated
integration boundary and test credentials/environment. - \[ \] Implement
public process search. - \[ \] Implement a public process detail view
with an explicit allowlist of disclosable fields/documents. - \[ \] Add
tests to ensure internal data is never exposed publicly.

**Exit criterion:** an approved process can be published, its evidence
is retained, and the public can consult only the intended public
information.

### Phase 6 --- Administration, reports, and MVP hardening

**Goal:** complete supporting functionality and make the MVP reliable.

Tasks: - \[ \] Implement user administration and active/inactive
management. - \[ \] Implement role and department assignment. - \[ \]
Define and implement the permission matrix. - \[ \] Add management of
document types/legal hypotheses/workflow parameters only to the extent
required by MVP. - \[ \] Implement reports listed in the screen-flow
document, prioritizing operationally useful reports. - \[ \] Complete
audit-history views and audit integrity protections. - \[ \] Add
pagination, filtering, empty states, loading states, and error states. -
\[ \] Verify accessibility and responsive behavior. - \[ \] Add
end-to-end tests for the complete requester-to-publication scenario. -
\[ \] Run lint, formatting, tests, and production build. - \[ \]
Document setup, environment variables (names only), migrations, seed
data, and operational limitations.

**Exit criterion:** the MVP acceptance scenario in Section 2 works
reliably in a clean environment, and the main business rules are covered
by automated tests.

---

## 10. Testing and engineering requirements

Testing is part of each phase, not a final separate activity.

### Required test layers

- **Unit tests:** domain calculations and pure validation rules (for
  example, quotation totals and allowed state transitions).
- **API integration tests:** endpoint behavior, validation,
  authentication, authorization, and persistence.
- **Workflow integration tests:** complete process transitions and
  their side effects.
- **UI tests:** add where the project's existing tooling supports them
  and where they provide meaningful coverage.
- **End-to-end acceptance test:** at least one complete
  requester-to-publication/public-consultation journey.

### Minimum critical test cases

- Unauthenticated users cannot access protected process operations.
- A requester cannot access or modify another department's process
  unless explicitly authorized.
- A user cannot submit an incomplete process.
- A process cannot skip a required workflow stage.
- A reviewer cannot approve a process they are not authorized to
  review.
- A returned process becomes editable only under the defined rules.
- Rejected/closed processes cannot continue through ordinary approval
  transitions.
- Concurrent process creation cannot generate duplicate number/year
  pairs.
- Invalid or unauthorized document downloads are denied.
- Public endpoints never expose internal-only fields or documents.
- Publication cannot occur before the required approval state.
- Audit/history entries are written consistently with the business
  operation.

### Environment/database caution

A prior development conversation identified a problem caused by the
application and test runner using different databases. Verify
`.env.development`, `.env.test`, Prisma configuration, and test setup
before diagnosing persistence discrepancies.

Never run test reset/migration commands against a development or
production database. Confirm the target database before running any
destructive database command.

---

## 11. Open decisions requiring project-owner confirmation

These questions were raised during planning and documented in the conversation.

---

Decision Options discussed Recommended starting
point

---

Procurement item Confirmed single-object scope for MVP. Each process represents an indivisible procurement object with one overall estimated value (`Process.estimatedValue`) and total quotation values (`Quotation.value`). No `ProcessItem` or `QuotationItem` introduced. Price comparison is conducted on total quotation values.

Approval workflow Sequential; parallel; Sequential is simpler
hybrid for an MVP, unless the
source workflow or
institution requires
otherwise

PNCP scope Simulated/preparation; Simulate first, then
live integration; implement live
simulation first then integration if required
live integration

Approval stages Exact stages and Derive from the
responsible roles not internal analysis flow
yet confirmed and project
requirements; do not
invent institutional
roles

Legal checklist Exact Article 75 Confirm legal scope and
hypotheses and authoritative rule
validation rules not source before coding
specified in the  
supplied screen-flow  
text

Public disclosure Exact fields and Use an explicit public
documents to expose are allowlist and
not defined conservative defaults

Notifications Email/in-app Treat as optional
notifications are not unless required by the
fully specified approved MVP scope
------------------------------------------------------------------------

Agents should ask for confirmation or consult the other project
documents before making irreversible domain choices.

---

## 12. Explicit non-goals unless separately approved

Do not expand the MVP without a requirement. The following are not
established as mandatory by the supplied workflow documents:

- A public self-registration flow.
- A full electronic-signature provider integration.
- A live PNCP integration rather than a prepared/simulated workflow.
- Complex configurable workflow designer.
- Advanced BI/analytics.
- Multiple institutions/tenants.
- A general-purpose document-management platform unrelated to
  procurement processes.
- Automatic legal advice or definitive legal compliance certification.

The application may simulate some administrative steps for the PI-II
academic project. Clearly label simulated integrations and do not
represent a simulated publication as an actual external publication.

---

## 13. Definition of Done for each feature

A feature is considered done only when all applicable items are
satisfied:

- [ ] Requirement and expected behavior are clear.
- [ ] Existing implementation has been checked to avoid duplication.
- [ ] Domain rules are implemented server-side.
- [ ] Authentication and authorization are enforced server-side.
- [ ] Input is validated and errors use existing project conventions.
- [ ] Database changes have a Prisma migration when schema changes are
      required.
- [ ] The UI supports loading, success, empty, and error states.
- [ ] Relevant actions are recorded in history/audit.
- [ ] Unit/integration tests cover success and failure paths.
- [ ] Existing tests continue to pass.
- [ ] Lint/format checks pass.
- [ ] Documentation is updated.
- [ ] No secrets or environment-specific credentials are committed.

---

## 14. Phase 2 Completion Summary & Immediate Next Actions

### 14.1 Phase 2: Procurement Preparation (Completed)

Phase 2 has been fully implemented, tested, and verified on branch `feat/procurement-preparation`:

1. **Procurement Object Scope Decision:**
   - Single-object scope confirmed: each `Process` models one indivisible procurement object with one overall estimated value (`Process.estimatedValue`) and total quotation values (`Quotation.value`). No `ProcessItem` or `QuotationItem` abstractions introduced.

2. **Supplier Management (`supplier.service.js` & `/api/v1/suppliers`):**
   - CRUD and searchable lookup by legal name, trade name, and CNPJ.
   - Algorithmic CNPJ validation (14 numeric digits, reject identical repeat sequences, two check digit calculation passes) and automatic string normalization (`XX.XXX.XXX/YYYY-ZZ`).
   - Uniqueness conflict handling on duplicate CNPJ with standard `ConflictError` (409).
   - Least-privilege authorization: `ADMIN` and `AGENTE_CONTRATACAO` can create/update; authenticated users can search and view.

3. **Quotation Management (`quotation.service.js` & `/api/v1/processes/[processId]/quotations`):**
   - Quotation registration, retrieval, updating, and deletion scoped strictly to authorized processes and suppliers.
   - Financial decimal precision using exact cents arithmetic and `Prisma.Decimal` to avoid floating-point inaccuracies.
   - Enforced database constraint: one quotation per supplier per process (`@@unique([processId, supplierId])`).
   - Process lifecycle locks: quotations cannot be added or modified once a process moves to `AWAITING_APPROVAL`, `APPROVED`, or `COMPLETED`.
   - Immutable audit logging: `QUOTATION_ADDED` and `QUOTATION_UPDATED`.

4. **Comparative Price Map:**
   - Pure domain calculation engine (`buildComparativePriceMap`) in `quotation.service.js`.
   - Computes total quotation count, identifies lowest quotation(s), calculates arithmetic average, and calculates absolute/percentage variance from the lowest bid for every quotation.
   - Gracefully handles zero quotations, single quotation, and ties.
   - Strict architectural boundary: price calculation is purely descriptive and **never** automatically selects a supplier or advances process status.

5. **Document Management (`storage.service.js`, `document.service.js`, & `/api/v1/processes/[processId]/documents`):**
   - Upload metadata persistence and disk-based file persistence outside PostgreSQL (`storage/uploads/`).
   - Magic bytes / signature verification preventing file type spoofing (PDF `%PDF-`, PNG, JPEG, DOCX, XLSX, ODT, TXT) and 15MB file size limit.
   - Path traversal defenses and safe generated storage keys (`doc_<uuid>.<ext>`).
   - Streaming downloads with sanitized `Content-Disposition` headers and role-based access checks.
   - Soft deletion (`isActive = false`) and transaction rollback removing disk files if database transactions fail.
   - Audit logging: `DOCUMENT_UPLOADED`.

6. **Process Detail Integration (`/processes/[processId]`):**
   - Seamlessly integrated into the Process Detail layout across specialized sub-tabs:
     - **Pesquisa de Preços:** KPI metrics (lowest quote, average quote, total quotes), comparative map table with badges and variance %, and quotation registration modal.
     - **Documentos:** Procurement document checklist (TR, Pesquisa de Preços, Documentação do Fornecedor, etc.), upload drop-zone, and active documents table with download/delete actions.
     - **Fornecedores:** Directory search, supplier selection for quotations, and quick supplier registration modal.

7. **Database Migration:**
   - Migration `20261104230000_phase_2_procurement_preparation` committed and deployed, introducing `isActive` to `Document`, `@@unique([processId, supplierId])` to `Quotation`, and composite indexes for performance.

8. **Quality Assurance & Verification:**
   - 15/15 test suites passing (127/127 tests: 62 unit tests, 65 integration tests).
   - Next.js production build (`npm run build`) compiles cleanly without errors or browser bundle leakage.
   - Code style verified with 100% compliance across `npm run lint:eslint:check` and `npm run lint:prettier:check`.

---

### 14.3 Phase 3 Implementation Summary (2026-11-05)

Phase 3 delivered the legal classification engine, formal justifications, supplier selection enforcement, and the atomic process submission workflow:

1. **Authoritative Legal Sources & Annual Decrees:**
   - Consolidated text of **Lei nº 14.133/2021, Art. 75** (Diretoria de Informação Legislativa / Portal da Legislação da Presidência da República).
   - Annual threshold adjustment decrees pursuant to Art. 182:
     - **Decreto nº 11.871/2023** (effective 01/01/2024): Inciso I = R$ 119.812,02; Inciso II = R$ 59.906,02.
     - **Decreto nº 12.343/2024** (effective 01/01/2025): Inciso I = R$ 125.451,15; Inciso II = R$ 62.725,59.
     - **Decreto nº 12.807/2025** (effective 01/01/2026): Inciso I = R$ 130.984,20; Inciso II = R$ 65.492,11.
   - Situational hypotheses supported: Inciso III (unsuccessful procurement / licitação deserta/fracassada), Inciso IV (operational emergency / emergência/calamidade), Inciso VII (commercial defense / intervenção no domínio econômico), Inciso VIII (contracting public entities), Inciso IX (national security / segurança nacional), Inciso XI (perishable goods / hortifrutigranjeiros).
   - Clear distinction between **Hard Blocking Errors** (e.g. estimated value exceeding applicable monetary threshold), **Advisory Warnings** (e.g. fewer than 3 registered quotations, selected quotation is not the lowest quote), and **Human Review Items** (legal compliance disclosure explicitly stating human legal opinion is mandatory).

2. **Database Migration:**
   - Migration `20261105010000_phase_3_legal_justifications_submission` added `legalJustification` and `priceJustification` (nullable `TEXT`) to `Process`.
   - Extended `AuditAction` enum with `LEGAL_CLASSIFICATION_UPDATED`, `PRICE_JUSTIFICATION_UPDATED`, and `SUPPLIER_JUSTIFICATION_UPDATED`.

3. **Domain & Application Services:**
   - `src/domain/legal-classification.js`: Pure JavaScript domain rules, decree thresholds, hypothesis metadata, and validation routines without Node/DB dependencies, safe for both client and server.
   - `src/services/legal.service.js`: Domain service coordinating legal classification persistence and audit trail logging.
   - `src/services/submission.service.js`: Process completeness validation engine (`validateProcessCompleteness`) checking 7 distinct process dimensions (Basic Information, DFD, Legal Classification, Price Research, Justifications, Supplier Selection, and Documents). Atomic submission transaction (`submitProcess`) transitioning status (`DRAFT` / `PRICE_RESEARCH` / `SUPPLIER_SELECTED` -> `AWAITING_APPROVAL`) and logging `PROCESS_SUBMITTED`.
   - `src/services/process.service.js`: Updated to handle justifications, supplier selection authorization (`canUserSelectSupplier`, requiring selected supplier to have a quotation on the process), and root-level permission serialization.

4. **Dedicated REST API Endpoints:**
   - `PUT /api/v1/processes/:processId/legal-classification`: Updates legal basis and justification with validation.
   - `PUT /api/v1/processes/:processId/justifications`: Updates price and supplier justifications with audit logging.
   - `PUT /api/v1/processes/:processId/supplier`: Formally selects supplier from quotations on the process.
   - `POST /api/v1/processes/:processId/submit`: Validates completeness and executes atomic submission.

5. **User Interface Components & UI Hardening:**
   - `LegalClassificationTab.jsx`: Hypothesis selection, threshold verification table, dynamic error/warning/human review disclosures, and justification input.
   - `JustificationsTab.jsx`: Supplier selection with quote comparison highlight, lowest-quote advisory indicator, and separate price/supplier justification fields.
   - `ProcessReviewTab.jsx`: Comprehensive executive summary, interactive 7-point readiness checklist with pending items, and submission modal with legal disclaimer.
   - `QuotationFormModal.jsx` & `SupplierFormModal.jsx`: Hardened responsive modal dialog layout fixing a Tailwind CSS v4 spacing token collision on `max-w-lg`, added background blur backdrop (`bg-black/50 backdrop-blur-sm`), vertical scrolling (`max-h-[90vh] overflow-y-auto`), and backdrop/Escape dismiss.
   - **Brazilian Phone Masking & Normalization:** Implemented live dynamic telephone masking in `SupplierFormModal.jsx` (supporting 10-digit landline `(XX) XXXX-XXXX` and 11-digit mobile `(XX) XXXXX-XXXX`, stripping `+55` international prefixes) via `formatPhone` and `normalizePhone` in `dashboardUtils.js`, with consistent masked formatting across `SupplierManagementTab.jsx` and `JustificationsTab.jsx`.
   - Integrated seamlessly into Process Detail tabs at `/processes/[processId]`.

6. **Quality Assurance & Verification:**
   - 20/20 test suites passing (185/185 tests: 94 unit tests, 91 integration tests).
   - Next.js production build (`npm run build`) compiles cleanly without bundle leakage.
   - Code style verified with 100% compliance across `npm run lint:eslint:check` and `npm run lint:prettier:check`.

---

### 14.4 Next Priority: Phase 4 — Internal Analysis and Approval Workflow

With Phase 3 complete, the next phase will implement:

1. Workflow stages and responsible roles (`AGENTE_CONTRATACAO`, `ANALISTA`, `AUTORIDADE_COMPETENTE`).
2. Internal analysis inbox for assigned/pending processes in `AWAITING_APPROVAL` status.
3. Analysis view with stage progression: Approve, Request Adjustment (return to requester), Reject/Close.
4. Historical and audit tracking of reviewer decisions, formal opinions, and approval chains.

---

## 15. Source-of-truth and maintenance policy

This document consolidates the requirements and planning available on
2026-11-05. It is not a substitute for inspecting the live repository.

When implementation changes:

- Update this document when an MVP requirement, workflow,
  architectural decision, or phase status changes.
- Keep completed checkboxes and status claims evidence-based.
- Record important decisions and their rationale.
- Distinguish implemented behavior from planned behavior.
- Do not mark a phase complete until its exit criterion is
  demonstrated.
- If this document conflicts with a more recent, explicitly approved
  project decision, update this document and explain the change.
- Keep legal requirements and external integration behavior current
  and independently verified.

**Current overall status:** Phase 0 (Repository audit and alignment), Phase 1 (Process foundation), Phase 2 (Procurement preparation), and Phase 3 (Legal Classification, Justifications & Submission Workflow) are **COMPLETE**. The next priority is **Phase 4: Internal Analysis and Approval Workflow**.
