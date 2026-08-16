# SISD — Phase 2: Requirements

## 1. Overview

This document defines the requirements for **SISD — Sistema de Gestão de Dispensas**, a university project designed to provide a realistic internal workflow for managing a simplified **dispensa de licitação** process.

The requirements described here are derived from the Phase 1 domain model and establish the functional scope, business rules, non-functional requirements, use cases, acceptance criteria, and MVP boundary.

The project intentionally focuses on the administrative workflow and does not attempt to implement every aspect of Brazilian public procurement.

> **Important domain boundary:** SISD does not determine whether a procurement legally qualifies as a dispensa de licitação. The responsible public servant provides the legal basis; the system manages the process information, documents, quotations, workflow, approvals, and audit history.

---

# 2. Scope

The system supports a simplified procurement workflow from demand registration through approval and completion.

The main flow is:

```text
Demand
  ↓
Process creation
  ↓
Analysis
  ↓
Price research
  ↓
Supplier selection
  ↓
Document verification
  ↓
Approval
  ├──→ Rejection
  ↓
Completion
```

The MVP includes:

- Authentication
- Users
- Roles
- Departments
- Procurement processes
- Process workflow
- Suppliers
- Price quotations
- Required process documents
- File uploads
- Approval and rejection
- Audit history
- Dashboard

The MVP does not include:

- PNCP integration
- Public procurement portal
- Supplier bidding portal
- Electronic signatures
- Contracts
- Payments
- Accounting
- Government-system integrations
- AI
- Automatic legal interpretation
- Support for every type of dispensa
- Support for every type of contratação direta

---

# 3. Actors

The system defines four primary roles.

## 3.1 SOLICITANTE

The employee who identifies a need and initiates a process.

Responsibilities:

- Register a demand.
- Provide information about the requested purchase.
- Attach initial documentation.
- Follow the process.

---

## 3.2 AGENTE_CONTRATACAO

The employee responsible for processing the procurement case.

Responsibilities:

- Analyze the demand.
- Manage quotations.
- Register suppliers.
- Select a supplier.
- Manage process documents.
- Provide supplier-selection justification.
- Submit the process for approval.
- Complete approved processes.

---

## 3.3 APROVADOR

The authorized user responsible for reviewing and deciding on a process awaiting approval.

Responsibilities:

- Review the process.
- Approve a process.
- Reject a process.
- Provide a justification when rejecting.

---

## 3.4 ADMIN

The system administrator.

Responsibilities:

- Manage users.
- Manage departments.
- Access processes.
- Maintain basic system configuration.

---

# 4. Functional Requirements

Functional requirements describe what the system must be capable of doing.

## 4.1 Authentication

### RF-001 — User authentication

The system shall allow registered users to authenticate using an email address and password.

### RF-002 — User logout

The system shall allow authenticated users to terminate their session.

### RF-003 — Role-based access

The system shall restrict functionality according to the authenticated user's role.

The principal permission model is:

```text
SOLICITANTE
    ↓
Create and follow requests

AGENTE_CONTRATACAO
    ↓
Process procurement cases

APROVADOR
    ↓
Approve / reject processes

ADMIN
    ↓
Manage system
```

Authorization must be enforced on the server/API and must not rely solely on hiding UI elements.

---

# 5. User Management

### RF-004 — Create user

An administrator shall be able to create a user with:

- Name
- Email
- Password
- Role
- Department
- Active/inactive status

### RF-005 — List users

An administrator shall be able to view registered users.

### RF-006 — Edit user

An administrator shall be able to change a user's:

- Name
- Role
- Department
- Active/inactive status

Password-reset workflows, email verification, OAuth, and other advanced account-management features are outside the MVP.

---

# 6. Department Management

### RF-007 — Create department

An administrator shall be able to register a department.

Example departments:

```text
Secretaria de Educação
Secretaria de Saúde
Secretaria de Administração
```

### RF-008 — List departments

The system shall display registered departments.

### RF-009 — Associate users with departments

A user may belong to a department.

A process stores its own department association rather than deriving it dynamically from the requester's current department.

---

# 7. Process Management

### RF-010 — Create process

A `SOLICITANTE` shall be able to create a process containing:

- Title
- Object
- Detailed description
- Department
- Legal basis
- Estimated value, when already known

The system shall automatically generate or assign:

- Process identifier
- Creation date
- Initial status
- Creator

The initial status shall be:

```text
DRAFT
```

---

### RF-011 — Save process as draft

A user shall be able to save an incomplete process as a draft.

Example:

```text
Process #001/2026

Status:
DRAFT
```

---

### RF-012 — Edit draft

The creator shall be able to edit a process while it is in `DRAFT`.

---

### RF-013 — Submit process

The solicitante shall be able to submit a process for analysis.

Before submission, the system shall validate the minimum required information.

---

### RF-014 — List processes

Authenticated users shall be able to view processes they are authorized to access.

The list shall support basic filtering by:

- Process number
- Status
- Department
- Date

Advanced search is outside the MVP.

---

### RF-015 — View process

The system shall display the complete information of a process.

The process details view shall provide access to:

```text
Overview
Price research
Supplier
Documents
History
```

A process details screen is the centerpiece of the application.

A conceptual layout is:

```text
┌─────────────────────────────────────────────────────────┐
│ Processo #001/2026                         [Em análise] │
│                                                         │
│ Aquisição de computadores                               │
│ Secretaria Municipal de Educação                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Visão geral │ Preços │ Fornecedor │ Documentos │ Histórico
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Objeto                                                  │
│ Aquisição de 10 computadores desktop...                │
│                                                         │
│ Valor estimado                                          │
│ R$ 43.500,00                                            │
│                                                         │
│ Fundamentação                                           │
│ Art. 75, II                                             │
│                                                         │
│ Solicitante                                             │
│ João Silva                                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

The workflow should be visually represented to the user:

```text
DRAFT → ANÁLISE → PREÇOS → FORNECEDOR → APROVAÇÃO → CONCLUÍDO
```

---

# 8. Process Workflow

### RF-016 — Change process status

The system shall allow authorized users to advance a process through the predefined workflow.

The workflow is:

```text
DRAFT
  ↓
IN_ANALYSIS
  ↓
PRICE_RESEARCH
  ↓
SUPPLIER_SELECTED
  ↓
AWAITING_APPROVAL
  ↓
APPROVED
  ↓
COMPLETED
```

A process awaiting approval may also be rejected:

```text
AWAITING_APPROVAL
        ↓
    REJECTED
```

### RF-017 — Restrict status transitions

The system shall prevent unauthorized or invalid status transitions.

For example:

```text
DRAFT → APPROVED
```

must be impossible.

The API/service layer shall enforce the valid transition rules.

---

# 9. Price Research

### RF-018 — Add quotation

An `AGENTE_CONTRATACAO` shall be able to add a quotation to a process.

A quotation shall contain:

- Supplier
- Description
- Value
- Date
- Optional supporting document

### RF-019 — List quotations

The system shall display all quotations associated with a process.

Example:

| Supplier  |        Value |
| --------- | -----------: |
| Empresa A | R$ 45.000,00 |
| Empresa B | R$ 42.000,00 |
| Empresa C | R$ 43.500,00 |

### RF-020 — Calculate reference price

The system shall calculate a simplified reference price using the average value of the registered quotations.

For the academic prototype:

```text
referencePrice =
    sum(quotations) / quotations.length
```

This calculation is explicitly a project simplification and does not claim to reproduce every legally applicable Brazilian price-estimation methodology.

### RF-021 — Attach quotation evidence

The agent shall be able to attach supporting documents to a quotation.

Example:

```text
orcamento-empresa-a.pdf
```

---

# 10. Supplier Management

### RF-022 — Register supplier

An agent shall be able to register a supplier with:

- Legal name
- Trade name
- CNPJ
- Email
- Phone

### RF-023 — List suppliers

The system shall allow authorized users to view and search registered suppliers.

### RF-024 — Select supplier

An agent shall be able to associate one supplier with the process as the selected supplier.

The system shall require a written justification.

Example:

```text
Supplier:
Empresa ABC Ltda.

Justification:
Fornecedor apresentou a menor proposta compatível
com as especificações requeridas.
```

---

# 11. Document Management

### RF-025 — Upload document

Authorized users shall be able to upload documents associated with a process.

Each document shall contain:

- Document type
- Filename
- Storage reference
- MIME type
- File size
- Uploader
- Upload date

### RF-026 — View documents

Users authorized to view the process shall be able to see its documents.

### RF-027 — Download document

Authorized users shall be able to download an attached document.

### RF-028 — Document checklist

The system shall display the expected documents for the process.

Example:

```text
✓ Documento de Formalização da Demanda
✓ Pesquisa de preços
✓ Justificativa de preço
✓ Razão da escolha do fornecedor
✓ Documentação do fornecedor
○ Parecer jurídico
```

The exact applicability of documents is simplified for the academic MVP.

---

# 12. Approval

### RF-029 — Submit for approval

The agent shall be able to submit a complete process for approval.

Before submission, the system shall validate the minimum required information and applicable documents.

### RF-030 — Approval queue

An `APROVADOR` shall have access to processes awaiting approval.

Example:

```text
Processos aguardando sua aprovação

#001/2026
Aquisição de computadores
R$ 42.000,00

#002/2026
Aquisição de impressoras
R$ 18.500,00
```

### RF-031 — Approve process

An approver shall be able to approve a process.

The system shall:

1. Record the decision.
2. Record the approving user.
3. Record the timestamp.
4. Update the process status.
5. Create an audit event.

The resulting status shall be:

```text
APPROVED
```

### RF-032 — Reject process

An approver shall be able to reject a process.

A rejection shall require a reason.

Example:

```text
Please provide additional justification for
the supplier selection.
```

The resulting status shall be:

```text
REJECTED
```

---

# 13. Audit History

### RF-033 — Record relevant actions

The system shall record important events, including:

- Process creation
- Process update
- Process submission
- Quotation creation
- Quotation update
- Supplier selection
- Document upload
- Submission for approval
- Approval
- Rejection
- Completion

### RF-034 — Display process history

Authorized users shall be able to see a chronological history of relevant process events.

Example:

```text
15/08/2026 08:31
João Silva created the process.

15/08/2026 09:12
Maria Oliveira added a quotation of R$ 42.000,00.

15/08/2026 09:45
Maria Oliveira selected Empresa ABC.

15/08/2026 10:15
Maria Oliveira submitted the process for approval.

15/08/2026 11:03
Carlos Souza approved the process.
```

---

# 14. Dashboard

### RF-035 — Dashboard

The system shall provide a dashboard containing basic process metrics.

Example:

```text
12
Em andamento

4
Aguardando aprovação

28
Concluídos

R$ 340.500,00
Valor aprovado
```

### RF-036 — Recent processes

The dashboard shall display recently created or updated processes.

---

# 15. Process Completion

### RF-037 — Complete approved process

An authorized agent shall be able to mark an approved process as completed.

The system shall record:

- User
- Date
- Time

The process shall transition to:

```text
COMPLETED
```

Completed processes shall no longer be editable through the normal workflow.

---

# 16. Business Rules

Business rules define constraints that the system must enforce.

## RN-001 — Required process data

A process cannot be submitted if mandatory basic information is missing.

---

## RN-002 — Valid status transitions

A process can only move through permitted workflow states.

Valid example:

```text
DRAFT → IN_ANALYSIS
```

Invalid example:

```text
DRAFT → APPROVED
```

---

## RN-003 — Quotation requirement

For the simplified MVP, a process must have at least **three quotations** before proceeding to supplier selection.

This is a project-level simplification and must not be presented as a universal legal requirement for Brazilian procurement.

---

## RN-004 — Supplier requirement

A process cannot enter `AWAITING_APPROVAL` without a selected supplier.

---

## RN-005 — Supplier justification

Supplier selection requires a written justification.

---

## RN-006 — Required documents

A process cannot be submitted for approval while applicable required documents are missing.

---

## RN-007 — Approval permission

Only users with the following role may approve or reject a process:

```text
APROVADOR
```

---

## RN-008 — Rejection justification

A rejected process must contain a rejection reason.

---

## RN-009 — Approved process integrity

An approved process cannot have its core procurement information modified through ordinary editing.

---

## RN-010 — Auditability

Relevant state changes and domain actions must generate an audit record.

---

## RN-011 — Single-organization scope

The MVP assumes a single fictional municipality/public organization.

Multi-tenancy is outside the scope.

A future SaaS implementation could introduce:

```text
Organization
   ↓
Departments
   ↓
Users
   ↓
Processes
```

but this is intentionally excluded from the current project.

---

# 17. Non-Functional Requirements

## RNF-001 — Usability

The system should provide an intuitive web interface suitable for users with basic computer skills.

---

## RNF-002 — Responsiveness

The application should work effectively on:

- Desktop
- Tablet

Mobile phones are not a first-class target for the MVP.

---

## RNF-003 — Security

The system shall:

- Require authentication.
- Enforce role-based authorization.
- Protect unauthorized process access.
- Validate uploaded files.
- Never store passwords in plaintext.
- Enforce authorization on the server/API.

---

## RNF-004 — Data integrity

Operations involving multiple related database changes shall use transactions where appropriate.

For example, approving a process involves:

```text
Approve process
      ↓
Create Approval
      +
Update Process status
      +
Create AuditLog
```

These operations should succeed or fail as a single unit.

---

## RNF-005 — Auditability

Important operations shall be traceable to:

- An authenticated user.
- A timestamp.
- The affected process.
- The action performed.

---

## RNF-006 — Performance

Under normal development/academic load, ordinary application operations should respond within approximately two seconds.

The project does not require enterprise-scale performance targets.

---

## RNF-007 — Availability

The system should support normal working-hour usage.

High-availability infrastructure, failover, clustering, and disaster-recovery infrastructure are outside the MVP.

---

## RNF-008 — Maintainability

The application should maintain a clear separation between:

```text
API / HTTP layer
        ↓
Application / business logic
        ↓
Persistence
```

The domain rules should not be scattered across React components or API handlers.

---

# 18. Primary Use Case

## UC-001 — Process a Dispensa

This is the primary end-to-end use case and represents the application's golden path.

### Actors

- `SOLICITANTE`
- `AGENTE_CONTRATACAO`
- `APROVADOR`

### Main flow

```text
1. Solicitante creates process
          ↓
2. System validates required fields
          ↓
3. Process enters IN_ANALYSIS
          ↓
4. Agent reviews demand
          ↓
5. Agent adds quotations
          ↓
6. System calculates reference price
          ↓
7. Agent selects supplier
          ↓
8. Agent provides justification
          ↓
9. Agent uploads required documents
          ↓
10. Agent submits for approval
          ↓
11. Approver reviews process
          ↓
     ┌────┴────┐
     ↓         ↓
  APPROVE    REJECT
     ↓         ↓
  APPROVED   REJECTED
     ↓
 COMPLETED
```

This flow is the primary criterion for determining whether the MVP is functional.

---

# 19. Acceptance Criteria

## AC-001 — Create process

**Given** an authenticated `SOLICITANTE`

**When** the user provides the required information and saves the process

**Then** the system creates the process with status:

```text
DRAFT
```

---

## AC-002 — Submit process

**Given** a process in `DRAFT`

**When** the solicitante submits the process

**Then** the system validates mandatory information and changes the status to:

```text
IN_ANALYSIS
```

---

## AC-003 — Add quotations

**Given** an agent is processing a process

**When** the agent adds three valid quotations

**Then** all three quotations are associated with the process and the system can calculate the simplified reference price.

---

## AC-004 — Select supplier

**Given** a process with quotations

**When** the agent selects a supplier and provides a justification

**Then** the supplier becomes the selected supplier and the justification is stored.

---

## AC-005 — Submit for approval

**Given** a process with the required information, supplier selection, and applicable documents

**When** the agent submits the process for approval

**Then** the process changes to:

```text
AWAITING_APPROVAL
```

and an audit event is created.

---

## AC-006 — Approve process

**Given** a complete process awaiting approval

**When** an approver approves the process

**Then**:

```text
status = APPROVED
```

and the system creates both an approval record and an audit record.

---

## AC-007 — Reject process

**Given** a process awaiting approval

**When** an approver attempts to reject the process without a reason

**Then** the system refuses the operation.

---

## AC-008 — Successful rejection

**Given** a process awaiting approval

**When** an approver rejects the process and provides a reason

**Then**:

```text
status = REJECTED
```

and the rejection is recorded in the approval and audit history.

---

## AC-009 — Unauthorized approval

**Given** a user who is not an approver

**When** that user attempts to approve a process

**Then** the API denies the operation.

The frontend must not be the only authorization boundary.

---

## AC-010 — Invalid status transition

**Given** a process in `DRAFT`

**When** an API client attempts to transition it directly to `APPROVED`

**Then** the API rejects the operation.

---

## AC-011 — Missing supplier

**Given** a process without a selected supplier

**When** the agent attempts to submit it for approval

**Then** the API rejects the operation.

---

## AC-012 — Missing required documents

**Given** a process missing applicable required documents

**When** the agent attempts to submit it for approval

**Then** the API rejects the operation and identifies the missing requirements.

---

# 20. MVP Definition of Done

The MVP is considered functionally complete when a user can demonstrate the following complete scenario:

```text
LOGIN
  ↓
Create a process
  ↓
Add 3 quotations
  ↓
See calculated reference price
  ↓
Select supplier
  ↓
Upload documents
  ↓
Submit for approval
  ↓
Log in as approver
  ↓
Review process
  ↓
Approve or reject
  ↓
See audit history
  ↓
See updated dashboard
```

Once this complete flow is operational, additional features should not be added unless they are necessary to improve correctness, usability, security, testing, or presentation quality.

The project should then focus on:

- Testing
- Error handling
- UI polish
- Security
- Documentation
- Demonstration readiness

---

# 21. Application Structure Constraint

The application will use a layered architecture.

```text
┌─────────────────────────────┐
│           UI                │
│ React / Next.js             │
└──────────────┬──────────────┘
               │ HTTP
┌──────────────▼──────────────┐
│          API                │
│ Next.js API Routes          │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│   Application / Domain      │
│                             │
│ ProcessService              │
│ QuotationService            │
│ SupplierService             │
│ DocumentService             │
│ ApprovalService             │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│       Persistence           │
│ Prisma + PostgreSQL         │
└─────────────────────────────┘
```

API routes are responsible for HTTP concerns.

Services are responsible for application and business logic.

Prisma is responsible for persistence.

React components should not contain core procurement workflow rules.

---

# 22. Planned Application Areas

The requirements imply the following principal application areas:

```text
1. Authentication

2. Dashboard

3. Process list

4. Process creation/editing

5. Process details
   ├── Overview
   ├── Price research
   ├── Supplier
   ├── Documents
   └── History

6. Supplier list/details

7. Approval queue

8. User management

9. Department management
```

Several of these may be combined into tabs or nested views. The exact frontend routing structure is an implementation concern and does not change the requirements.

---

# 23. MVP Scope Boundary

The following table establishes the project's hard scope boundary.

| Area                             | MVP |
| -------------------------------- | :-: |
| Authentication                   | ✅  |
| Users                            | ✅  |
| Roles                            | ✅  |
| Departments                      | ✅  |
| Processes                        | ✅  |
| Process workflow                 | ✅  |
| Suppliers                        | ✅  |
| Price quotations                 | ✅  |
| Required documents               | ✅  |
| File uploads                     | ✅  |
| Approval/rejection               | ✅  |
| Audit history                    | ✅  |
| Dashboard                        | ✅  |
| PNCP integration                 | ❌  |
| Public procurement portal        | ❌  |
| Supplier bidding portal          | ❌  |
| Electronic signatures            | ❌  |
| Contracts                        | ❌  |
| Payments                         | ❌  |
| Accounting                       | ❌  |
| Government integrations          | ❌  |
| AI                               | ❌  |
| Automatic legal interpretation   | ❌  |
| Every type of dispensa           | ❌  |
| Every type of contratação direta | ❌  |

---

# 24. Requirements Summary

Phase 2 establishes:

- **4 actors**
- **37 functional requirements**
- **11 business rules**
- **8 non-functional requirements**
- **1 primary end-to-end use case**
- **12 acceptance criteria**
- **1 explicit MVP boundary**

The resulting specification is intentionally constrained to a realistic university project while maintaining a credible real-world application.

The implementation order established by the project is:

```text
Requirements
      ↓
Domain
      ↓
Database
      ↓
API
      ↓
UI
      ↓
Implementation
      ↓
Testing
```

This order keeps the business rules explicit before implementation details are introduced.
