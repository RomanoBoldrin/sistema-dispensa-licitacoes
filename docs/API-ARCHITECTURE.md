# SISD — API Architecture

## 1. Overview

This document defines the API architecture for **SISD — Sistema de Gestão de Dispensas**.

The API is responsible for exposing the system's application capabilities over HTTP while keeping domain and business rules outside the HTTP layer.

The application will use:

- **Next.js**
- **Next.js Pages Router**
- **Next.js API Routes**
- **TypeScript**
- **Prisma**
- **PostgreSQL**
- REST-style HTTP endpoints
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
Next.js API Routes
        │
        ▼
Application Services
        │
        ▼
Prisma
        │
        ▼
PostgreSQL
```

The frontend must not access Prisma directly.

---

## 2.2 Thin route handlers

API route handlers should primarily be responsible for:

1. Receiving the HTTP request.
2. Authenticating the user.
3. Parsing and validating request data.
4. Calling the appropriate service.
5. Translating the service result into an HTTP response.
6. Handling known application errors.

A route handler should **not** contain the complete business workflow.

Bad:

```typescript
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // validate everything
  // check permissions
  // check status
  // update process
  // create audit log
  // create approval
  // calculate values
  // return response
}
```

Preferred:

```typescript
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const user = await requireAuth(req);
  const body = createProcessSchema.parse(req.body);

  const result = await processService.create(body, user);

  return res.status(201).json({
    data: result,
  });
}
```

The service owns the domain operation.

---

# 3. Why the Pages Router

The project deliberately uses the Next.js **Pages Router**.

The API will therefore live under:

```text
src/pages/api/
```

rather than:

```text
src/app/api/
```

This choice provides a straightforward API architecture:

```text
HTTP Request
     ↓
pages/api/*
     ↓
Service
     ↓
Prisma
     ↓
PostgreSQL
```

For this university project, the Pages Router provides everything required for the API without introducing App Router-specific concepts that are not necessary for the MVP.

The choice does not change the external API contract.

For example:

```http
POST /api/processes/:id/approve
```

remains the same regardless of which Next.js routing system is used.

---

# 4. Layered Architecture

The API follows a simple layered architecture.

```text
┌──────────────────────────────────────┐
│              HTTP Layer              │
│                                      │
│      Next.js Pages API Routes        │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│        Application Layer             │
│                                      │
│       Domain/Application Services    │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│        Persistence Layer             │
│                                      │
│              Prisma                  │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│             PostgreSQL               │
└──────────────────────────────────────┘
```

The architecture intentionally avoids unnecessary layers such as repositories, mappers, or generic CRUD abstractions unless a concrete need emerges during implementation.

---

# 5. HTTP Layer — Pages API Routes

The HTTP layer is implemented using Next.js API Routes.

Unlike the App Router, Pages API Routes use:

```typescript
NextApiRequest;
NextApiResponse;
```

Example:

```typescript
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Method not allowed.",
      },
    });
  }

  // Authentication
  // Validation
  // Service call
  // Response
}
```

The HTTP layer is responsible for:

- HTTP method handling
- Authentication
- Request parsing
- Request validation
- Parameter extraction
- Calling application services
- HTTP status codes
- Response serialization

It should not directly implement procurement business rules.

---

# 6. Application / Service Layer

The service layer contains the application's business operations.

Planned services include:

```text
ProcessService
QuotationService
SupplierService
DocumentService
ApprovalService
UserService
DepartmentService
AuditService
```

## ProcessService

Responsibilities:

- Create process
- Update process
- Submit process
- Validate status transitions
- Complete process
- Retrieve process details
- List processes

## QuotationService

Responsibilities:

- Add quotation
- Update quotation
- List quotations
- Calculate reference price

## SupplierService

Responsibilities:

- Create supplier
- Search suppliers
- Select supplier for process

## DocumentService

Responsibilities:

- Upload document metadata
- Validate document requirements
- List documents
- Remove documents where permitted

## ApprovalService

Responsibilities:

- Submit for approval
- Approve process
- Reject process

## UserService

Responsibilities:

- Create users
- List users
- Update users
- Manage user status and role

## DepartmentService

Responsibilities:

- Create departments
- List departments
- Update departments

## AuditService

Responsibilities:

- Record domain events
- Retrieve process history

---

# 7. Persistence Layer

Prisma is responsible for communication with PostgreSQL.

The API services may use Prisma directly for the MVP, provided that persistence operations remain outside API route handlers.

Example:

```typescript
await prisma.process.findUnique(...)
```

should exist in a service layer rather than inside the API route itself.

The current persistence model is defined by the project's Prisma schema.

Core models include:

```text
User
Department
Process
Supplier
Quotation
Document
Approval
AuditLog
```

---

# 8. Project Structure

The proposed Next.js project structure is:

```text
src/
├── pages/
│   └── api/
│       ├── auth/
│       │   ├── login.ts
│       │   └── logout.ts
│       │
│       ├── processes/
│       │   ├── index.ts
│       │   └── [id]/
│       │       ├── index.ts
│       │       ├── submit.ts
│       │       ├── quotations.ts
│       │       ├── supplier.ts
│       │       ├── documents.ts
│       │       ├── submit-for-approval.ts
│       │       ├── approve.ts
│       │       ├── reject.ts
│       │       ├── complete.ts
│       │       └── history.ts
│       │
│       ├── suppliers/
│       │   ├── index.ts
│       │   └── [id].ts
│       │
│       ├── users/
│       │   ├── index.ts
│       │   └── [id].ts
│       │
│       └── departments/
│           ├── index.ts
│           └── [id].ts
│
├── services/
│   ├── process.service.ts
│   ├── quotation.service.ts
│   ├── supplier.service.ts
│   ├── document.service.ts
│   ├── approval.service.ts
│   ├── user.service.ts
│   ├── department.service.ts
│   └── audit.service.ts
│
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── permissions.ts
│   ├── errors.ts
│   └── validation.ts
│
└── types/
    ├── auth.ts
    ├── process.ts
    └── api.ts
```

The frontend pages/components may coexist with the API under `src/pages`, but the API portion must remain under:

```text
src/pages/api/
```

---

# 9. Route-to-URL Mapping

The Pages Router maps files directly to API URLs.

For example:

```text
src/pages/api/processes/index.ts
```

maps to:

```text
/api/processes
```

and:

```text
src/pages/api/processes/[id]/approve.ts
```

maps to:

```text
/api/processes/:id/approve
```

The following table illustrates the mapping.

| File                                     | Endpoint                        |
| ---------------------------------------- | ------------------------------- |
| `pages/api/processes/index.ts`           | `/api/processes`                |
| `pages/api/processes/[id]/index.ts`      | `/api/processes/:id`            |
| `pages/api/processes/[id]/submit.ts`     | `/api/processes/:id/submit`     |
| `pages/api/processes/[id]/quotations.ts` | `/api/processes/:id/quotations` |
| `pages/api/processes/[id]/supplier.ts`   | `/api/processes/:id/supplier`   |
| `pages/api/processes/[id]/documents.ts`  | `/api/processes/:id/documents`  |
| `pages/api/processes/[id]/approve.ts`    | `/api/processes/:id/approve`    |
| `pages/api/processes/[id]/reject.ts`     | `/api/processes/:id/reject`     |
| `pages/api/processes/[id]/complete.ts`   | `/api/processes/:id/complete`   |
| `pages/api/processes/[id]/history.ts`    | `/api/processes/:id/history`    |

---

# 10. API Versioning

The MVP does not require URL versioning.

Endpoints therefore use:

```text
/api/...
```

rather than:

```text
/api/v1/...
```

If the application becomes a public or long-lived API, versioning can be introduced later.

For the university project, explicit versioning would add complexity without a meaningful benefit.

---

# 11. Resource-Oriented Endpoints

The API exposes the main domain resources through REST-style endpoints.

## Processes

```http
GET    /api/processes
POST   /api/processes

GET    /api/processes/:id
PATCH  /api/processes/:id
```

The generic `PATCH` endpoint is intended only for permitted editable process fields.

It must not be used to bypass workflow actions.

---

## Process Actions

Domain-specific actions use explicit endpoints:

```http
POST /api/processes/:id/submit
POST /api/processes/:id/submit-for-approval
POST /api/processes/:id/approve
POST /api/processes/:id/reject
POST /api/processes/:id/complete
```

These endpoints represent business operations rather than arbitrary database updates.

---

## Quotations

```http
GET  /api/processes/:id/quotations
POST /api/processes/:id/quotations
```

Individual quotation editing may be exposed as:

```http
GET   /api/quotations/:id
PATCH /api/quotations/:id
```

if required by the final implementation.

---

## Suppliers

```http
GET  /api/suppliers
POST /api/suppliers

GET   /api/suppliers/:id
PATCH /api/suppliers/:id
```

Supplier selection is a process action:

```http
POST /api/processes/:id/supplier
```

---

## Documents

```http
GET  /api/processes/:id/documents
POST /api/processes/:id/documents
```

Actual binary storage is separated from the database.

The `Document` record contains metadata and a storage reference.

---

## Approval

Approval actions are exposed as process actions:

```http
POST /api/processes/:id/approve
POST /api/processes/:id/reject
```

An approval should not be represented as a generic `PATCH` operation on the process.

---

## Process History

```http
GET /api/processes/:id/history
```

The history endpoint returns relevant audit events associated with the process.

---

## Users

```http
GET   /api/users
POST  /api/users

GET   /api/users/:id
PATCH /api/users/:id
```

User management is restricted to administrators.

---

## Departments

```http
GET   /api/departments
POST  /api/departments

GET   /api/departments/:id
PATCH /api/departments/:id
```

Department management is restricted to administrators.

---

# 12. HTTP Methods

The API follows conventional HTTP semantics.

| Method   | Purpose                                     |
| -------- | ------------------------------------------- |
| `GET`    | Retrieve resources                          |
| `POST`   | Create resources or execute domain actions  |
| `PATCH`  | Partially update editable resources         |
| `DELETE` | Delete resources where explicitly permitted |

Not every domain operation needs a generic CRUD endpoint.

For example:

```http
POST /api/processes/:id/approve
```

is preferred over:

```http
PATCH /api/processes/:id
{
  "status": "APPROVED"
}
```

The explicit action prevents clients from directly manipulating workflow state.

---

# 13. Authentication

Authentication is required for protected endpoints.

The authentication layer should expose a helper conceptually similar to:

```typescript
const user = await requireAuth(req, res);
```

The helper should return the authenticated user's identity and role.

Example:

```typescript
type AuthenticatedUser = {
  id: string;
  role: UserRole;
  departmentId: string | null;
};
```

Authentication implementation details are intentionally separated from business services.

---

# 14. Authorization

Authentication answers:

> Who is this user?

Authorization answers:

> Is this user allowed to perform this operation?

Authorization must be implemented server-side.

A permission helper may expose operations such as:

```typescript
requireRole(user, UserRole.ADMIN);
```

or:

```typescript
canEditProcess(user, process);
```

The following role restrictions are part of the MVP authorization model.

| Operation           | ADMIN | SOLICITANTE | AGENTE | APROVADOR |
| ------------------- | :---: | :---------: | :----: | :-------: |
| Manage users        |   ✓   |             |        |           |
| Manage departments  |   ✓   |             |        |           |
| Create process      |   ✓   |      ✓      |   ✓    |           |
| Edit draft          |   ✓   |      ✓      |   ✓    |           |
| Add quotations      |   ✓   |             |   ✓    |           |
| Select supplier     |   ✓   |             |   ✓    |           |
| Upload documents    |   ✓   |      ✓      |   ✓    |           |
| Submit for approval |   ✓   |             |   ✓    |           |
| Approve             |       |             |        |     ✓     |
| Reject              |       |             |        |     ✓     |
| Complete            |   ✓   |             |   ✓    |           |

This table represents the MVP authorization model and may be refined during implementation.

---

# 15. Process Access Control

Role alone may not be sufficient to determine access.

The API should also consider the relationship between the authenticated user and the process.

For example, a solicitante should not automatically have access to every process merely because they have the `SOLICITANTE` role.

The service layer should evaluate:

```text
User
  ↓
Role
  +
Department / ownership
  +
Process state
  ↓
Permission
```

The exact access policy can be refined during implementation, but unauthorized process access must be rejected server-side.

---

# 16. Request Validation

Incoming request data must be validated before reaching business operations.

Validation should cover:

- Required fields
- Data types
- String lengths
- Email format
- CNPJ format
- Monetary values
- IDs
- Enumerated values
- File metadata
- Domain-specific constraints

A schema-validation library such as Zod is appropriate for the TypeScript stack.

Conceptually:

```typescript
const createProcessSchema = z.object({
  title: z.string().min(1),
  object: z.string().min(1),
  description: z.string().optional(),
  legalBasis: z.string().optional(),
  estimatedValue: z.number().nonnegative().optional(),
  departmentId: z.string().uuid(),
});
```

Validation should occur before the service operation.

---

# 17. Error Handling

The API should expose predictable error responses.

A common response structure is:

```json
{
  "error": {
    "code": "PROCESS_INVALID_STATUS",
    "message": "The process cannot be approved from its current status."
  }
}
```

Suggested application error codes include:

```text
AUTHENTICATION_REQUIRED
FORBIDDEN
RESOURCE_NOT_FOUND

VALIDATION_ERROR

PROCESS_NOT_FOUND
PROCESS_INVALID_STATUS
PROCESS_MISSING_QUOTATIONS
PROCESS_MISSING_SUPPLIER
PROCESS_MISSING_DOCUMENTS
PROCESS_ALREADY_COMPLETED

SUPPLIER_NOT_FOUND
QUOTATION_NOT_FOUND
DOCUMENT_NOT_FOUND

APPROVAL_REASON_REQUIRED
```

The exact list may grow during implementation.

---

# 18. HTTP Status Codes

The API should use standard HTTP status codes.

| Status | Meaning                                  |
| -----: | ---------------------------------------- |
|  `200` | Successful request                       |
|  `201` | Resource created                         |
|  `204` | Successful request with no response body |
|  `400` | Invalid request                          |
|  `401` | Authentication required/invalid          |
|  `403` | Authenticated but not authorized         |
|  `404` | Resource not found                       |
|  `409` | Conflict with current state              |
|  `422` | Semantically invalid input               |
|  `500` | Unexpected server error                  |

Example:

```http
POST /api/processes/123/approve
```

If the process is not awaiting approval:

```http
409 Conflict
```

If the user is not an approver:

```http
403 Forbidden
```

If the process does not exist:

```http
404 Not Found
```

---

# 19. API Response Format

Successful responses should be consistent.

A resource response may be:

```json
{
  "data": {
    "id": "..."
  }
}
```

A collection response may be:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 42
  }
}
```

Pagination metadata is optional for endpoints where the MVP dataset is small, but the response format leaves room for pagination.

---

# 20. Process Creation

## Endpoint

```http
POST /api/processes
```

## Roles

Allowed:

```text
ADMIN
SOLICITANTE
AGENTE_CONTRATACAO
```

## Request

```json
{
  "title": "Aquisição de computadores",
  "object": "Aquisição de 10 computadores desktop",
  "description": "Computadores destinados aos laboratórios...",
  "legalBasis": "Art. 75, II",
  "estimatedValue": "43500.00",
  "departmentId": "..."
}
```

## Result

The system creates:

```text
Process
status = DRAFT
requester = authenticated user
createdAt = current timestamp
```

and creates an audit event:

```text
PROCESS_CREATED
```

---

# 21. Process Submission

## Endpoint

```http
POST /api/processes/:id/submit
```

The service verifies:

```text
Process exists?
       ↓
User authorized?
       ↓
Current status = DRAFT?
       ↓
Required fields present?
       ↓
Update status
       ↓
Create audit event
```

Result:

```text
DRAFT → IN_ANALYSIS
```

---

# 22. Supplier Selection

## Endpoint

```http
POST /api/processes/:id/supplier
```

Request:

```json
{
  "supplierId": "...",
  "justification": "Fornecedor apresentou a menor proposta compatível."
}
```

The service verifies:

- Process exists.
- User is authorized.
- Current process state allows supplier selection.
- Supplier exists.
- Required quotation condition has been satisfied.
- Justification is present.

The operation stores:

```text
selectedSupplierId
supplierJustification
```

and creates:

```text
SUPPLIER_SELECTED
```

in the audit history.

---

# 23. Submission for Approval

## Endpoint

```http
POST /api/processes/:id/submit-for-approval
```

The service validates:

```text
Process exists
        ↓
User authorized
        ↓
Valid current status
        ↓
Required quotations
        ↓
Selected supplier
        ↓
Supplier justification
        ↓
Required documents
        ↓
Transition to AWAITING_APPROVAL
        ↓
Create audit event
```

This operation must not be implemented as a simple status update.

---

# 24. Approval

## Endpoint

```http
POST /api/processes/:id/approve
```

The service verifies:

```text
Authenticated?
       ↓
Role = APROVADOR?
       ↓
Process exists?
       ↓
Status = AWAITING_APPROVAL?
       ↓
Create Approval
       ↓
Update Process
       ↓
Create AuditLog
```

The three database operations should execute within a Prisma transaction.

---

# 25. Rejection

## Endpoint

```http
POST /api/processes/:id/reject
```

Request:

```json
{
  "comment": "Necessária documentação adicional do fornecedor."
}
```

The service verifies:

- User is an approver.
- Process exists.
- Process is awaiting approval.
- Rejection reason is present.

Then, inside a transaction:

```text
Create Approval(REJECTED)
        +
Update Process(REJECTED)
        +
Create AuditLog(PROCESS_REJECTED)
```

---

# 26. Completion

## Endpoint

```http
POST /api/processes/:id/complete
```

The service verifies:

```text
User authorized
       ↓
Process exists
       ↓
Status = APPROVED
       ↓
Update status → COMPLETED
       ↓
Create audit event
```

Once completed, the normal process-editing workflow is locked.

---

# 27. Transactions

Transactions are required when a single business operation modifies multiple related records.

### Approval example

```typescript
await prisma.$transaction(async (tx) => {
  await tx.approval.create(...);

  await tx.process.update(...);

  await tx.auditLog.create(...);
});
```

If any operation fails, all changes are rolled back.

The same principle applies to other operations where consistency requires multiple database writes.

---

# 28. Audit Logging

Audit records should be generated by the service layer rather than by individual frontend components.

For example:

```typescript
await auditService.record({
  processId,
  userId: user.id,
  action: AuditAction.PROCESS_APPROVED,
  description: "Process approved.",
});
```

This ensures that auditability remains a backend responsibility.

---

# 29. File Uploads

Documents are represented in the database by metadata:

```text
Document
├── type
├── filename
├── storageKey
├── mimeType
├── size
├── uploadedBy
└── process
```

The actual binary file is stored separately.

The API should:

1. Authenticate the user.
2. Verify authorization.
3. Validate file type and size.
4. Store the file.
5. Create the `Document` record.
6. Create the corresponding audit event.

If multiple database operations are required, they should be handled consistently with the storage strategy.

---

# 30. Pagination and Filtering

Process listing should support basic filtering.

Example:

```http
GET /api/processes?status=AWAITING_APPROVAL
```

Possible filters:

```text
status
departmentId
requesterId
year
createdFrom
createdTo
```

Pagination may use:

```text
page
pageSize
```

Example:

```http
GET /api/processes?page=1&pageSize=20&status=APPROVED
```

The exact pagination strategy can remain simple for the MVP.

---

# 31. API Security Requirements

The API must:

- Authenticate protected requests.
- Authorize every protected operation.
- Validate all incoming data.
- Never trust role information supplied by the client.
- Never trust process status supplied by the client for workflow transitions.
- Never expose password hashes.
- Validate uploaded files.
- Avoid leaking internal database errors to clients.
- Avoid returning unnecessary sensitive information.
- Use parameterized/database-safe queries through Prisma.

The client must never be able to perform:

```http
PATCH /api/processes/123
{
  "status": "APPROVED"
}
```

as a way to bypass the approval workflow.

---

# 32. Domain Rules Must Live in Services

A critical architectural rule is:

> **API routes orchestrate HTTP. Services enforce domain behavior.**

For example, this is incorrect:

```typescript
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await prisma.process.update({
    where: { id: req.query.id as string },
    data: {
      status: "APPROVED",
    },
  });

  return res.status(200).end();
}
```

The API has bypassed:

- authorization;
- process-state validation;
- approval creation;
- audit logging.

Instead:

```typescript
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const user = await requireAuth(req, res);

  const result = await approvalService.approve(req.query.id as string, user);

  return res.status(200).json({
    data: result,
  });
}
```

The service controls the complete operation.

---

# 33. API Contract Summary

| Resource/Action     | Method | Endpoint                                 |
| ------------------- | ------ | ---------------------------------------- |
| List processes      | GET    | `/api/processes`                         |
| Create process      | POST   | `/api/processes`                         |
| Get process         | GET    | `/api/processes/:id`                     |
| Update process      | PATCH  | `/api/processes/:id`                     |
| Submit process      | POST   | `/api/processes/:id/submit`              |
| List quotations     | GET    | `/api/processes/:id/quotations`          |
| Add quotation       | POST   | `/api/processes/:id/quotations`          |
| Select supplier     | POST   | `/api/processes/:id/supplier`            |
| List documents      | GET    | `/api/processes/:id/documents`           |
| Upload document     | POST   | `/api/processes/:id/documents`           |
| Submit for approval | POST   | `/api/processes/:id/submit-for-approval` |
| Approve             | POST   | `/api/processes/:id/approve`             |
| Reject              | POST   | `/api/processes/:id/reject`              |
| Complete            | POST   | `/api/processes/:id/complete`            |
| Process history     | GET    | `/api/processes/:id/history`             |
| List suppliers      | GET    | `/api/suppliers`                         |
| Create supplier     | POST   | `/api/suppliers`                         |
| Get supplier        | GET    | `/api/suppliers/:id`                     |
| Update supplier     | PATCH  | `/api/suppliers/:id`                     |
| List users          | GET    | `/api/users`                             |
| Create user         | POST   | `/api/users`                             |
| Get user            | GET    | `/api/users/:id`                         |
| Update user         | PATCH  | `/api/users/:id`                         |
| List departments    | GET    | `/api/departments`                       |
| Create department   | POST   | `/api/departments`                       |
| Get department      | GET    | `/api/departments/:id`                   |
| Update department   | PATCH  | `/api/departments/:id`                   |

---

# 34. Example End-to-End API Flow

The primary use case can be represented at the API level as:

```text
POST /api/auth/login
        ↓
POST /api/processes
        ↓
POST /api/processes/:id/submit
        ↓
POST /api/processes/:id/quotations
        ↓
POST /api/processes/:id/quotations
        ↓
POST /api/processes/:id/quotations
        ↓
POST /api/processes/:id/supplier
        ↓
POST /api/processes/:id/documents
        ↓
POST /api/processes/:id/submit-for-approval
        ↓
POST /api/processes/:id/approve
        ↓
POST /api/processes/:id/complete
```

At every step:

```text
HTTP Request
     ↓
Authentication
     ↓
Authorization
     ↓
Validation
     ↓
Service
     ↓
Database
     ↓
Audit when applicable
     ↓
HTTP Response
```

---

# 35. API Architecture Definition of Done

The API architecture is considered established when:

- Next.js Pages Router API Routes are the HTTP entry point.
- API routes are located under `src/pages/api`.
- API routes remain thin.
- Business operations are implemented in services.
- Prisma is isolated from route handlers.
- Authentication is centralized.
- Authorization is enforced server-side.
- Request validation is centralized/reusable.
- Domain actions have explicit endpoints.
- Process status cannot be changed arbitrarily through the API.
- Important multi-write operations use transactions.
- Audit records are created by backend services.
- API errors have consistent structures.
- HTTP status codes are used consistently.
- The principal endpoints are documented.
- The API supports the complete MVP golden path.

---

# 36. Architecture Summary

The resulting architecture is:

```text
                         CLIENT
                           │
                           │ HTTP / JSON
                           ▼
              ┌────────────────────────┐
              │  Next.js Pages Router  │
              │       API Routes       │
              │                        │
              │ Auth / Validation      │
              │ HTTP / Errors          │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │       Services         │
              │                        │
              │ ProcessService         │
              │ QuotationService       │
              │ SupplierService        │
              │ DocumentService        │
              │ ApprovalService        │
              │ AuditService           │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │         Prisma         │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │      PostgreSQL        │
              └────────────────────────┘
```

The central architectural principle is:

> **HTTP handlers expose the application; services enforce the domain; Prisma persists the domain.**

The routing decision is:

> **SISD uses the Next.js Pages Router and Pages API Routes (`src/pages/api`) for its API layer.**

This provides enough structure to keep the project maintainable without introducing unnecessary enterprise architecture.
