# SISD — API Architecture

## 1. Overview

This document defines the API architecture for **SISD — Sistema de Dispensa de Licitações**.

The API is responsible for exposing the system's application capabilities over HTTP while keeping domain and business rules outside the HTTP layer.

The application uses:

- **Next.js 16.3 (Pages Router)**
- **Next.js API Routes (`src/pages/api/v1/`)**
- **`next-connect` for HTTP method routing and centralized error handling**
- **JavaScript (ES Modules)**
- **Prisma 7.9 (`@prisma/adapter-pg`)**
- **PostgreSQL**
- REST-style HTTP endpoints under `/api/v1/`
- JSON request/response payloads

The project intentionally uses the **Pages Router** rather than the App Router. This is a deliberate architectural choice for the MVP because the application is API-centered and does not require App Router-specific features such as Server Components or Server Actions.

The architectural goal is to keep the API predictable, secure, testable, and easy to evolve without allowing business logic to become scattered throughout route handlers.

---

# 2. Architectural Principles

The API follows these principles.

## 2.1 API-first separation

The frontend communicates with the backend through HTTP APIs.

```text
React / Next.js UI
        │
        │ HTTP
        ▼
Next.js API Routes (/api/v1/*)
        │
        ▼
Application / Domain Services (src/services/*)
        │
        ▼
Prisma (src/infra/prisma.js)
        │
        ▼
PostgreSQL
```

The frontend must not access Prisma directly.

---

## 2.2 Thin route handlers

API route handlers should primarily be responsible for:

1. Receiving the HTTP request via `next-connect`.
2. Authenticating the user via `authentication.getAuthenticatedUserFromRequest(request)`.
3. Extracting route/query parameters and request body.
4. Calling the appropriate domain service in `src/services/`.
5. Translating the service result into an HTTP response.
6. Delegating error serialization to `controller.errorHandlers` (`src/infra/controller.js`).

A route handler should **not** contain the complete business workflow.

Bad:

```javascript
async function postHandler(request, response) {
  // validate everything inline
  // check permissions inline
  // check status inline
  // update process directly via prisma
  // create audit log inline
  // return response
}
```

Preferred (as implemented in `src/pages/api/v1/processes/index.js`):

```javascript
import { createRouter } from "next-connect";
import controller from "src/infra/controller.js";
import authentication from "src/infra/authentication.js";
import processService from "src/services/process.service.js";

const router = createRouter();

router.get(getHandler);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const user = await authentication.getAuthenticatedUserFromRequest(request);
  const result = await processService.listProcesses(request.query, user);
  return response.status(200).json(result);
}

async function postHandler(request, response) {
  const user = await authentication.getAuthenticatedUserFromRequest(request);
  const createdProcess = await processService.createProcess(request.body, user);
  return response.status(201).json(createdProcess);
}
```

The service owns the domain operation, validation, authorization rules, and transactional persistence.

---

# 3. Why the Pages Router

The project deliberately uses the Next.js **Pages Router**.

The API lives under:

```text
src/pages/api/v1/
```

rather than:

```text
src/app/api/
```

This choice provides a straightforward API architecture:

```text
HTTP Request
     ↓
src/pages/api/v1/*
     ↓
src/services/*
     ↓
src/infra/prisma.js
     ↓
PostgreSQL
```

For this university project, the Pages Router provides everything required for the API without introducing App Router-specific concepts that are not necessary for the MVP.

---

# 4. Layered Architecture

The API follows a simple layered architecture.

```text
┌──────────────────────────────────────┐
│              HTTP Layer              │
│                                      │
│  Next.js Pages API Routes (/api/v1)  │
│  + next-connect + controller.js      │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│        Application Layer             │
│                                      │
│   Domain Services (src/services/*)   │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│        Infrastructure / DB           │
│                                      │
│      Prisma (src/infra/prisma.js)    │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│             PostgreSQL               │
└──────────────────────────────────────┘
```

The architecture intentionally avoids unnecessary layers such as repositories, mappers, or generic CRUD abstractions unless a concrete need emerges during implementation.

---

# 5. HTTP Layer — Pages API Routes & `next-connect`

The HTTP layer is implemented using Next.js Pages API Routes combined with `next-connect` and centralized error handlers in `src/infra/controller.js`.

Example (`src/pages/api/v1/processes/[processId]/index.js`):

```javascript
import { createRouter } from "next-connect";
import controller from "src/infra/controller.js";
import authentication from "src/infra/authentication.js";
import processService from "src/services/process.service.js";

const router = createRouter();

router.get(getHandler);
router.patch(patchHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const user = await authentication.getAuthenticatedUserFromRequest(request);
  const { processId } = request.query;

  const processRecord = await processService.getProcessById(processId, user);
  return response.status(200).json(processRecord);
}

async function patchHandler(request, response) {
  const user = await authentication.getAuthenticatedUserFromRequest(request);
  const { processId } = request.query;

  const updatedProcess = await processService.updateProcess(
    processId,
    request.body,
    user,
  );
  return response.status(200).json(updatedProcess);
}
```

The HTTP layer is responsible for:

- HTTP method routing (`router.get`, `router.post`, `router.patch`, etc.) and `405 Method Not Allowed` via `controller.errorHandlers.onNoMatch`
- Session authentication via `authentication.getAuthenticatedUserFromRequest(request)`
- Route/query parameter extraction
- Calling application/domain services
- HTTP status codes and response serialization
- Standardized error responses via `controller.errorHandlers.onError`

It must not directly implement procurement business rules.

---

# 6. Application / Service Layer

The service layer (`src/services/`) contains the application's business operations.

Implemented and planned services include:

```text
process.service.js      (Implemented — Phase 1)
quotation.service.js    (Planned — Phase 2)
supplier.service.js     (Planned — Phase 2)
document.service.js     (Planned — Phase 2)
approval.service.js     (Planned — Phase 4)
```

## `processService` (`src/services/process.service.js`)

Implemented responsibilities (Phase 1):

- **`createProcess(body, user)`**: Validates role (`ADMIN`, `SOLICITANTE`, `AGENTE_CONTRATACAO`), department authorization, process fields (`title`, `object`, `description`, `legalBasis`, `estimatedValue`), and DFD fields (`category`, `detailedJustification`, `technicalSpecifications`, `urgency`, `budgetSource`, `desiredDeadlineDays`, `responsibleName`, `responsibleEmail`). Allocates `(number, year)` safely on the server using a transaction-scoped PostgreSQL advisory lock (`pg_advisory_xact_lock`) and persists the `Process` (`DRAFT`), `DemandDocument`, and `AuditLog` (`PROCESS_CREATED`, `DEMAND_DOCUMENT_CREATED`) atomically.
- **`listProcesses(query, user)`**: Scopes accessible processes by role and ownership (`SOLICITANTE` restricted to own processes and forbidden from querying other departments), applies server-side filters (`status`, `departmentId`, `year`, `createdFrom`, `createdTo`, `search`), and returns paginated summaries (`processes`, `data`, `meta`, `departments`).
- **`getProcessById(processId, user)`**: Validates UUID format, enforces access control via `canUserAccessProcess`, and returns the process detail with explicit Prisma `select` projections (`department`, `requester`, `demandDocument`, `selectedSupplier`, `quotations`, `documents`, `approvals`, `auditLogs`, `permissions`).
- **`updateProcess(processId, body, user)`**: Rejects protected fields (`status`, `number`, `year`, `requesterId`, `departmentId`, etc.) with `400 ValidationError`, enforces ownership/role authorization (`403 ForbiddenError`), enforces `DRAFT`-only editing (`409 ConflictError`), updates `Process` and `DemandDocument` atomically (`upsert` without duplicating DFD records), and writes `PROCESS_UPDATED` / `DEMAND_DOCUMENT_UPDATED` to `AuditLog`.
- **Planned Phase 3+ operations**: `submitProcess`, workflow status transitions, and completion.

## `QuotationService` (Planned — Phase 2)

Responsibilities:

- Add quotation
- Update quotation
- List quotations
- Calculate reference price

## `SupplierService` (Planned — Phase 2)

Responsibilities:

- Create supplier
- Search suppliers
- Select supplier for process

## `DocumentService` (Planned — Phase 2)

Responsibilities:

- Upload document metadata
- Validate document requirements
- List documents
- Remove documents where permitted

## `ApprovalService` (Planned — Phase 4)

Responsibilities:

- Submit for approval
- Approve process
- Reject process

---

# 7. Persistence Layer

Prisma (`src/infra/prisma.js`) is responsible for communication with PostgreSQL.

The domain services use Prisma directly for the MVP, keeping persistence and transaction boundaries inside `src/services/` rather than scattering them across React components or route handlers.

Core models in `prisma/schema.prisma` include:

```text
User
Session
PasswordResetToken
Department
Process
DemandDocument
Supplier
Quotation
Document
Approval
AuditLog
```

---

# 8. Project Structure

The repository structure is:

```text
src/
├── components/
│   ├── auth/
│   ├── dashboard/
│   ├── demand-formalization/
│   └── home/
├── infra/
│   ├── authentication.js
│   ├── compose.yaml
│   ├── controller.js
│   ├── email.js
│   ├── errors.js
│   ├── password.js
│   ├── prisma.cjs
│   ├── prisma.js
│   ├── session.js
│   └── webserver.mjs
├── pages/
│   ├── api/v1/
│   │   ├── auth/
│   │   │   ├── forgot-password/index.js
│   │   │   ├── reset-password/index.js
│   │   │   └── sessions/index.js
│   │   ├── dashboard/index.js
│   │   ├── processes/
│   │   │   ├── index.js
│   │   │   └── [processId]/
│   │   │       └── index.js
│   │   ├── status/index.js
│   │   ├── user/index.js
│   │   └── users/
│   │       ├── index.js
│   │       └── [username]/index.js
│   ├── dashboard/index.js
│   ├── forgot-password/index.js
│   ├── login/index.js
│   ├── processes/
│   │   ├── index.js
│   │   ├── new.js
│   │   └── [processId]/index.js
│   └── reset-password/index.js
├── services/
│   └── process.service.js
└── tests/
    ├── integration/
    ├── orchestrator/
    └── unit/
```

---

# 9. Route-to-URL Mapping

The Pages Router maps files under `src/pages/api/v1/` directly to versioned API URLs.

| File                                                     | Endpoint                                  | Status      |
| -------------------------------------------------------- | ----------------------------------------- | ----------- |
| `src/pages/api/v1/status/index.js`                       | `/api/v1/status`                          | Implemented |
| `src/pages/api/v1/auth/sessions/index.js`                | `/api/v1/auth/sessions`                   | Implemented |
| `src/pages/api/v1/auth/forgot-password/index.js`         | `/api/v1/auth/forgot-password`            | Implemented |
| `src/pages/api/v1/auth/reset-password/index.js`          | `/api/v1/auth/reset-password`             | Implemented |
| `src/pages/api/v1/user/index.js`                         | `/api/v1/user`                            | Implemented |
| `src/pages/api/v1/users/index.js`                        | `/api/v1/users`                           | Implemented |
| `src/pages/api/v1/users/[username]/index.js`             | `/api/v1/users/:username`                 | Implemented |
| `src/pages/api/v1/dashboard/index.js`                    | `/api/v1/dashboard`                       | Implemented |
| `src/pages/api/v1/processes/index.js`                    | `/api/v1/processes`                       | Implemented |
| `src/pages/api/v1/processes/[processId]/index.js`        | `/api/v1/processes/:processId`            | Implemented |
| `src/pages/api/v1/processes/[processId]/submit/index.js` | `/api/v1/processes/:processId/submit`     | Planned     |
| `src/pages/api/v1/processes/[processId]/quotations/...`  | `/api/v1/processes/:processId/quotations` | Planned     |
| `src/pages/api/v1/processes/[processId]/supplier/...`    | `/api/v1/processes/:processId/supplier`   | Planned     |
| `src/pages/api/v1/processes/[processId]/documents/...`   | `/api/v1/processes/:processId/documents`  | Planned     |
| `src/pages/api/v1/processes/[processId]/approve/...`     | `/api/v1/processes/:processId/approve`    | Planned     |
| `src/pages/api/v1/processes/[processId]/reject/...`      | `/api/v1/processes/:processId/reject`     | Planned     |
| `src/pages/api/v1/processes/[processId]/complete/...`    | `/api/v1/processes/:processId/complete`   | Planned     |

---

# 10. API Versioning

All API endpoints in the repository are namespaced under:

```text
/api/v1/...
```

This convention is established across authentication (`/api/v1/auth/*`), user management (`/api/v1/user`, `/api/v1/users`), system status (`/api/v1/status`), dashboard (`/api/v1/dashboard`), and procurement processes (`/api/v1/processes`, `/api/v1/processes/[processId]`). All future endpoints must follow `/api/v1/...` to maintain consistency.

---

# 11. Resource-Oriented Endpoints

The API exposes the main domain resources through REST-style endpoints under `/api/v1/`.

## Processes (Implemented — Phase 1)

```http
GET    /api/v1/processes
POST   /api/v1/processes

GET    /api/v1/processes/:processId
PATCH  /api/v1/processes/:processId
```

The `PATCH /api/v1/processes/:processId` endpoint is restricted strictly to editable process and DFD fields while the process is in `DRAFT` status. Attempting to pass protected fields (`status`, `number`, `year`, `requesterId`, `departmentId`, etc.) returns `400 ValidationError`, and attempting to edit a non-`DRAFT` process returns `409 ConflictError`.

---

## Process Actions (Planned — Phases 3–5)

Domain-specific workflow transitions will use explicit action endpoints rather than generic `PATCH` updates:

```http
POST /api/v1/processes/:processId/submit
POST /api/v1/processes/:processId/submit-for-approval
POST /api/v1/processes/:processId/approve
POST /api/v1/processes/:processId/reject
POST /api/v1/processes/:processId/complete
```

---

## Quotations (Planned — Phase 2)

```http
GET  /api/v1/processes/:processId/quotations
POST /api/v1/processes/:processId/quotations
```

---

## Suppliers (Planned — Phase 2)

```http
GET  /api/v1/suppliers
POST /api/v1/suppliers

GET   /api/v1/suppliers/:supplierId
PATCH /api/v1/suppliers/:supplierId
```

Supplier selection is a process action:

```http
POST /api/v1/processes/:processId/supplier
```

---

## Documents (Planned — Phase 2)

```http
GET  /api/v1/processes/:processId/documents
POST /api/v1/processes/:processId/documents
```

Actual binary storage is separated from the database. The `Document` record contains metadata and a `storageKey` reference.

---

# 12. HTTP Methods

The API follows conventional HTTP semantics.

| Method   | Purpose                                     |
| -------- | ------------------------------------------- |
| `GET`    | Retrieve resources                          |
| `POST`   | Create resources or execute domain actions  |
| `PATCH`  | Partially update editable resources         |
| `DELETE` | Delete resources where explicitly permitted |

Not every domain operation needs a generic CRUD endpoint. For example:

```http
POST /api/v1/processes/:processId/approve
```

is preferred over:

```http
PATCH /api/v1/processes/:processId
{
  "status": "APPROVED"
}
```

The explicit action prevents clients from directly manipulating workflow state.

---

# 13. Authentication

Authentication is required for all protected endpoints and is centralized in `src/infra/authentication.js` and `src/infra/session.js`.

Protected endpoints authenticate incoming requests using the HTTP-only `session_id` cookie:

```javascript
const user = await authentication.getAuthenticatedUserFromRequest(request);
```

This helper validates the active session token hash against PostgreSQL, checks user active status (`isActive: true`, `deletedAt: null`), and returns the authenticated user object including their department relation:

```javascript
{
  id: string,
  name: string,
  email: string,
  role: "ADMIN" | "SOLICITANTE" | "AGENTE_CONTRATACAO" | "APROVADOR",
  isActive: boolean,
  departmentId: string | null,
  department: { id: string, name: string } | null
}
```

If no valid session is present, `UnauthorizedError` (`401`) is thrown and handled by `controller.errorHandlers`.

---

# 14. Authorization

Authentication answers:

> Who is this user?

Authorization answers:

> Is this user allowed to perform this operation?

Authorization is enforced server-side in the service layer (`src/services/process.service.js`).

The following role restrictions govern the MVP authorization model:

| Operation           | ADMIN | SOLICITANTE | AGENTE_CONTRATACAO | APROVADOR |
| ------------------- | :---: | :---------: | :----------------: | :-------: |
| Manage users        |   ✓   |             |                    |           |
| Manage departments  |   ✓   |             |                    |           |
| Create process      |   ✓   |      ✓      |         ✓          |           |
| Edit draft          |   ✓   |  ✓ (owner)  |      ✓ (dept)      |           |
| View process        |   ✓   |  ✓ (owner)  |         ✓          |     ✓     |
| Add quotations      |   ✓   |             |         ✓          |           |
| Select supplier     |   ✓   |             |         ✓          |           |
| Upload documents    |   ✓   |      ✓      |         ✓          |           |
| Submit for approval |   ✓   |             |         ✓          |           |
| Approve / Reject    |       |             |                    |     ✓     |
| Complete            |   ✓   |             |         ✓          |           |

---

# 15. Process Access Control

Role alone is not sufficient to determine access. `processService` evaluates role, department association, ownership, and process state:

1. **Process Creation (`createProcess`)**:
   - Allowed roles: `SOLICITANTE`, `AGENTE_CONTRATACAO`, `ADMIN`. (`APROVADOR` receives `403 ForbiddenError`).
   - Non-admin users (`SOLICITANTE`, `AGENTE_CONTRATACAO`) must have an assigned `user.departmentId` and can only create processes for their own department. Supplying a different `departmentId` throws `403 ForbiddenError`.
   - `ADMIN` users may specify an existing `departmentId` or fall back to their own `user.departmentId`.
2. **Process Listing & Detail (`listProcesses`, `getProcessById`, `canUserAccessProcess`)**:
   - `SOLICITANTE`: Can only list and view processes where `requesterId === user.id`. Attempting to filter by another department returns `403 ForbiddenError`.
   - `AGENTE_CONTRATACAO`, `APROVADOR`, `ADMIN`: Can list and view processes across departments to perform analysis, price research, approval, and oversight.
3. **Process Editing (`updateProcess`, `canUserEditProcess`)**:
   - Allowed only when `process.status === "DRAFT"` (otherwise throws `409 ConflictError`).
   - `SOLICITANTE`: Can only edit their own process (`requesterId === user.id` and matching department).
   - `AGENTE_CONTRATACAO`: Can edit draft processes belonging to their department (`departmentId === user.departmentId`).
   - `ADMIN`: Can edit any draft process.
   - `APROVADOR`: Cannot edit processes (`403 ForbiddenError`).

---

# 16. Request Validation

Incoming request data is validated server-side before database mutations occur.

Validation covers:

- Required strings and trimmed non-empty constraints (`title`, `object`, `detailedJustification`, `responsibleName`)
- Optional strings (`description`, `legalBasis`, `technicalSpecifications`, `budgetSource`)
- Enumerated values (`ObjectCategory`, `UrgencyLevel`, `ProcessStatus`)
- Monetary values (`estimatedValue` validated as a non-negative finite number with at most 2 decimal places)
- Positive integer constraints (`desiredDeadlineDays`, `year`, `page`, `pageSize`)
- Email format (`responsibleEmail`)
- UUID format (`processId`, `departmentId`)
- Rejecting protected fields on `PATCH` (`id`, `number`, `year`, `status`, `requesterId`, `departmentId`, `selectedSupplierId`, `supplierJustification`, `createdAt`, `updatedAt`, `deletedAt`)

---

# 17. Error Handling

The API uses custom error classes defined in `src/infra/errors.js` and serialized by `src/infra/controller.js`:

```json
{
  "name": "ValidationError",
  "message": "Invalid or missing title.",
  "action": "Provide a non-empty string for the process title.",
  "status_code": 400
}
```

Implemented error classes in `src/infra/errors.js`:

| Error Class             | HTTP Status | Purpose                                                          |
| ----------------------- | ----------: | ---------------------------------------------------------------- |
| `ValidationError`       |       `400` | Missing/invalid input fields or attempt to modify protected keys |
| `UnauthorizedError`     |       `401` | Missing, expired, or invalid session                             |
| `ForbiddenError`        |       `403` | Authenticated user lacks role, ownership, or department access   |
| `NotFoundError`         |       `404` | Requested resource (`Process`, `Department`, `User`) not found   |
| `MethodNotAllowedError` |       `405` | Unsupported HTTP method on route                                 |
| `ConflictError`         |       `409` | Operation conflicts with current resource state (e.g. non-DRAFT) |
| `InternalServerError`   |       `500` | Unexpected server error                                          |

---

# 18. HTTP Status Codes

| Status | Meaning                                               |
| -----: | ----------------------------------------------------- |
|  `200` | Successful `GET` or `PATCH` request                   |
|  `201` | Resource created (`POST`)                             |
|  `204` | Successful request with no response body (`DELETE`)   |
|  `400` | Invalid request (`ValidationError`)                   |
|  `401` | Authentication required/invalid (`UnauthorizedError`) |
|  `403` | Authenticated but not authorized (`ForbiddenError`)   |
|  `404` | Resource not found (`NotFoundError`)                  |
|  `405` | Method not allowed (`MethodNotAllowedError`)          |
|  `409` | Conflict with current state (`ConflictError`)         |
|  `500` | Unexpected server error (`InternalServerError`)       |

---

# 19. API Response Format

- **Single Resource (`POST /api/v1/processes`, `GET /api/v1/processes/:processId`, `PATCH /api/v1/processes/:processId`)**: Returns the serialized process object directly, using explicit Prisma `select` projections that exclude sensitive user fields (`passwordHash`, sessions, reset tokens).
- **Collection Resource (`GET /api/v1/processes`)**: Returns both `processes` and `data` arrays along with pagination metadata (`meta: { page, pageSize, total, totalPages }`) and accessible `departments` for filter controls.

---

# 20. Process Creation & Safe Numbering (Implemented — Phase 1)

## Endpoint

```http
POST /api/v1/processes
```

## Allowed Roles

```text
ADMIN
SOLICITANTE
AGENTE_CONTRATACAO
```

## Request Payload

Accepts process fields along with DFD fields (either top-level or nested under `demandDocument`):

```json
{
  "title": "Aquisição de computadores",
  "object": "Aquisição de 10 computadores desktop",
  "description": "Computadores destinados aos laboratórios de informática.",
  "legalBasis": "Art. 75, II da Lei 14.133/2021",
  "estimatedValue": 43500.0,
  "category": "IT_GOODS",
  "urgency": "MEDIUM",
  "detailedJustification": "Necessidade de atualização tecnológica dos laboratórios.",
  "technicalSpecifications": "Processador i7, 16GB RAM, SSD 512GB",
  "budgetSource": "Dotação 2026.01.04",
  "desiredDeadlineDays": 30,
  "responsibleName": "Maria Silva",
  "responsibleEmail": "maria@instituicao.gov.br"
}
```

## Concurrency-Safe Numbering & Transactional Persistence

Inside `processService.createProcess`:

1. Executes within `prisma.$transaction`.
2. Acquires a transaction-scoped PostgreSQL advisory lock for the current year:
   `SELECT pg_advisory_xact_lock(424242, currentYear)`
3. Queries the highest `number` for `currentYear` and computes `nextNumber = (lastProcess?.number ?? 0) + 1`.
4. Creates the `Process` (`status = "DRAFT"`, `requesterId = user.id`, `departmentId = resolvedDepartmentId`) and its nested 1:1 `DemandDocument`.
5. Records two `AuditLog` entries in the same transaction:
   - `PROCESS_CREATED`
   - `DEMAND_DOCUMENT_CREATED`
6. Wraps the transaction in a bounded retry loop (up to 3 attempts on Prisma `P2002` unique constraint errors on `[number, year]`).

---

# 21. Process Listing, Filtering, and Pagination (Implemented — Phase 1)

## Endpoint

```http
GET /api/v1/processes
```

## Supported Query Parameters

```text
status        (ProcessStatus enum)
departmentId  (UUID; SOLICITANTE restricted to own department)
year          (4-digit year, e.g. 2026)
createdFrom   (ISO date / YYYY-MM-DD)
createdTo     (ISO date / YYYY-MM-DD)
search        (matches process number, title, or object)
page          (default: 1)
pageSize      (default: 20, max: 100)
```

Example:

```http
GET /api/v1/processes?page=1&pageSize=20&status=DRAFT&year=2026
```

---

# 22. Process Details & Editing (Implemented — Phase 1)

## Retrieve Process Details

```http
GET /api/v1/processes/:processId
```

Returns process metadata, `department`, `requester` (safe projection), `demandDocument`, `selectedSupplier`, `quotations`, `documents`, `approvals`, `auditLogs`, and computed `permissions` (`canEdit`, `isDraft`).

## Edit Draft Process & DFD

```http
PATCH /api/v1/processes/:processId
```

- Requires the user to be authorized to edit the process (`canUserEditProcess`).
- Requires `process.status === "DRAFT"` (returns `409 ConflictError` otherwise).
- Rejects protected fields (`status`, `number`, `year`, `requesterId`, `departmentId`, etc.) with `400 ValidationError`.
- Updates `Process` and/or `DemandDocument` atomically inside `prisma.$transaction` without creating duplicate DFD records, and records `PROCESS_UPDATED` and/or `DEMAND_DOCUMENT_UPDATED` in `AuditLog`.

---

# 23. Planned Workflow Endpoints (Phases 2–5)

The following domain action endpoints are planned for subsequent phases:

- **Process Submission (`POST /api/v1/processes/:processId/submit`)**: Validates completeness of `DRAFT` process and transitions `DRAFT → IN_ANALYSIS` with `PROCESS_SUBMITTED` audit log.
- **Supplier Selection (`POST /api/v1/processes/:processId/supplier`)**: Validates quotations and justification, sets `selectedSupplierId` and `supplierJustification`, and logs `SUPPLIER_SELECTED`.
- **Submission for Approval (`POST /api/v1/processes/:processId/submit-for-approval`)**: Validates quotations, selected supplier, justification, and required documents, transitioning to `AWAITING_APPROVAL` with `PROCESS_SENT_FOR_APPROVAL`.
- **Approval (`POST /api/v1/processes/:processId/approve`)**: Restricted to `APROVADOR` when `status === "AWAITING_APPROVAL"`; creates `Approval(APPROVED)`, updates status to `APPROVED`, and logs `PROCESS_APPROVED` in a transaction.
- **Rejection (`POST /api/v1/processes/:processId/reject`)**: Restricted to `APROVADOR` when `status === "AWAITING_APPROVAL"`; requires comment, creates `Approval(REJECTED)`, updates status to `REJECTED`, and logs `PROCESS_REJECTED` in a transaction.
- **Completion (`POST /api/v1/processes/:processId/complete`)**: Transitions `APPROVED → COMPLETED` and logs `PROCESS_COMPLETED`.

---

# 24. API Security Requirements

The API enforces the following security guarantees:

- Authenticate protected requests via server-side sessions (`src/infra/authentication.js`).
- Authorize every protected operation server-side (`src/services/process.service.js`).
- Validate all incoming request payloads and query parameters.
- Never trust role, requester ID, department ID, or process status supplied by the client.
- Never expose `passwordHash`, session tokens, or password reset tokens in any API projection.
- Avoid leaking internal database errors to clients (`controller.errorHandlers`).
- Use parameterized queries through Prisma.

---

# 25. API Contract Summary

| Resource / Action    | Method      | Endpoint                                           | Phase Status        |
| -------------------- | ----------- | -------------------------------------------------- | ------------------- |
| System status        | GET         | `/api/v1/status`                                   | Implemented         |
| Login / Logout       | POST/DELETE | `/api/v1/auth/sessions`                            | Implemented         |
| Forgot password      | POST        | `/api/v1/auth/forgot-password`                     | Implemented         |
| Reset password       | POST        | `/api/v1/auth/reset-password`                      | Implemented         |
| Current user         | GET         | `/api/v1/user`                                     | Implemented         |
| Users                | POST/GET    | `/api/v1/users`, `/api/v1/users/:username`         | Implemented         |
| Dashboard            | GET         | `/api/v1/dashboard`                                | Implemented         |
| List processes       | GET         | `/api/v1/processes`                                | Implemented (Ph. 1) |
| Create process + DFD | POST        | `/api/v1/processes`                                | Implemented (Ph. 1) |
| Get process detail   | GET         | `/api/v1/processes/:processId`                     | Implemented (Ph. 1) |
| Update draft process | PATCH       | `/api/v1/processes/:processId`                     | Implemented (Ph. 1) |
| Submit process       | POST        | `/api/v1/processes/:processId/submit`              | Planned (Ph. 3)     |
| Quotations           | GET/POST    | `/api/v1/processes/:processId/quotations`          | Planned (Ph. 2)     |
| Select supplier      | POST        | `/api/v1/processes/:processId/supplier`            | Planned (Ph. 2)     |
| Documents            | GET/POST    | `/api/v1/processes/:processId/documents`           | Planned (Ph. 2)     |
| Submit for approval  | POST        | `/api/v1/processes/:processId/submit-for-approval` | Planned (Ph. 3)     |
| Approve              | POST        | `/api/v1/processes/:processId/approve`             | Planned (Ph. 4)     |
| Reject               | POST        | `/api/v1/processes/:processId/reject`              | Planned (Ph. 4)     |
| Complete             | POST        | `/api/v1/processes/:processId/complete`            | Planned (Ph. 5)     |
