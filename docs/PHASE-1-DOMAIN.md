# SISD — Phase 1: Domain

## 1. Overview

**SISD (Sistema de Gestão de Dispensas)** is a web application designed to support the internal management of a simplified **dispensa de licitação** process for a Brazilian public organization.

The system's purpose is to organize the administrative information, documents, quotations, supplier selection, approvals, and history associated with a procurement process.

The application is not intended to determine whether a procurement legally qualifies as a dispensa de licitação. The legal basis is provided by the responsible public servant, while the system provides the workflow and data-management mechanisms needed to register and process the case.

The project is intentionally scoped as a university project with a realistic real-world application rather than as a complete government procurement platform.

---

## 2. Domain Context

The application models a simplified internal workflow for a public organization.

A typical process begins when a department identifies a need:

1. A requester registers the demand.
2. The procurement agent analyzes the request.
3. Price quotations are registered.
4. A supplier is selected and the choice is justified.
5. Required documents are attached.
6. The process is submitted for approval.
7. An authorized approver approves or rejects the process.
8. An approved process may eventually be marked as completed.
9. Relevant actions are recorded in an audit history.

The workflow is represented by the following process states:

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
  ├──→ REJECTED
  ↓
APPROVED
  ↓
COMPLETED
```

These states represent the application's internal workflow. They should not be interpreted as a direct reproduction of legally mandated procedural phases.

---

## 3. Domain Actors

The domain contains four user roles.

### 3.1 SOLICITANTE

The requester who identifies a need and initiates a procurement process.

Responsibilities:

- Create processes.
- Provide demand information.
- Attach initial documents.
- Follow the progress of submitted processes.

### 3.2 AGENTE_CONTRATACAO

The user responsible for processing the procurement case.

Responsibilities:

- Analyze demands.
- Manage price quotations.
- Register suppliers.
- Select the supplier.
- Provide supplier-selection justification.
- Manage process documents.
- Submit the process for approval.
- Complete approved processes.

### 3.3 APROVADOR

The user responsible for reviewing the process and making the internal approval decision.

Responsibilities:

- Review processes awaiting approval.
- Approve processes.
- Reject processes.
- Provide a reason when rejecting a process.

### 3.4 ADMIN

The system administrator.

Responsibilities:

- Manage users.
- Manage departments.
- Access processes.
- Maintain basic system configuration.

---

## 4. Core Domain Entities

The initial domain model contains eight persistent entities:

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

Their relationships can be summarized as:

```text
User ────────────────┐
                     │
Department ──────────┼──→ Process
                     │      │
                     │      ├──→ Quotation ──→ Supplier
                     │      │
                     │      ├──→ Document
                     │      │
                     │      ├──→ Approval
                     │      │
                     │      └──→ AuditLog
                     │
User ────────────────────────┘
```

---

## 5. User

A `User` represents an authenticated person who interacts with the system.

### Main attributes

- `id`
- `name`
- `email`
- `passwordHash`
- `role`
- `isActive`
- `departmentId`
- `createdAt`
- `updatedAt`

### Role

The user's role is represented by the `UserRole` enum:

```text
ADMIN
SOLICITANTE
AGENTE_CONTRATACAO
APROVADOR
```

A user may optionally belong to a department.

A user may also be associated with:

- processes they requested;
- documents they uploaded;
- approvals they performed;
- audit events they generated.

---

## 6. Department

A `Department` represents an organizational department of the public entity.

Examples:

```text
Secretaria de Educação
Secretaria de Saúde
Secretaria de Administração
Secretaria de Obras
```

### Main attributes

- `id`
- `name`
- `createdAt`
- `updatedAt`

A department can have multiple users and multiple processes.

For the MVP, each user belongs to at most one department and each process belongs to one department.

The process stores its own `departmentId` instead of deriving the department from the requester. This preserves the department associated with the process even if the requester's department changes later.

---

## 7. Process

`Process` is the central domain entity.

It represents the administrative procurement case being managed by the system.

### Main attributes

- `id`
- `number`
- `year`
- `title`
- `object`
- `description`
- `legalBasis`
- `estimatedValue`
- `status`
- `departmentId`
- `requesterId`
- `selectedSupplierId`
- `supplierJustification`
- `createdAt`
- `updatedAt`

### Process identification

The process number is stored using two fields:

```text
number
year
```

with a database uniqueness constraint:

```text
@@unique([number, year])
```

This allows the application to display identifiers such as:

```text
001/2026
002/2026
003/2026
```

while preventing duplicate process numbers within the same year.

### Monetary value

`estimatedValue` uses PostgreSQL `Decimal(15,2)` rather than floating-point storage.

This is appropriate for monetary values because it avoids floating-point precision problems.

### Relationships

A process:

- belongs to one department;
- has one requester;
- may have one selected supplier;
- can have many quotations;
- can have many documents;
- can have many approval records;
- can have many audit logs.

---

## 8. Process Status

The process uses the `ProcessStatus` enum:

```text
DRAFT
IN_ANALYSIS
PRICE_RESEARCH
SUPPLIER_SELECTED
AWAITING_APPROVAL
REJECTED
APPROVED
COMPLETED
```

### DRAFT

The process is being created and may still be edited.

### IN_ANALYSIS

The procurement agent is reviewing the demand.

### PRICE_RESEARCH

Price quotations are being collected.

### SUPPLIER_SELECTED

A supplier has been selected based on the registered quotations and a written justification.

### AWAITING_APPROVAL

The process has been submitted to an approver.

### REJECTED

The approver rejected the process. A rejection reason is required.

### APPROVED

The process has received approval.

### COMPLETED

The administrative workflow represented by the MVP has been concluded.

---

## 9. Supplier

A `Supplier` represents a company or provider that can submit a quotation or be selected for a process.

### Main attributes

- `id`
- `legalName`
- `tradeName`
- `cnpj`
- `email`
- `phone`
- `createdAt`
- `updatedAt`

The CNPJ is unique.

A supplier can:

- have multiple quotations;
- be selected for multiple processes.

The model distinguishes between a supplier that submitted a quotation and the supplier ultimately selected for a process.

---

## 10. Quotation

A `Quotation` represents a supplier's price offer associated with a process.

### Main attributes

- `id`
- `processId`
- `supplierId`
- `description`
- `value`
- `quotedAt`
- `createdAt`
- `updatedAt`

The quotation value is stored as:

```text
Decimal(15,2)
```

### Relationship

A process may have multiple quotations:

```text
Process
 ├── Quotation → Supplier A
 ├── Quotation → Supplier B
 └── Quotation → Supplier C
```

For the MVP, the application-level business rule requires at least three quotations before supplier selection. This is a project-level simplification and is not intended to assert that Brazilian law universally requires exactly three quotations.

The system calculates a simplified reference price from the registered quotations.

---

## 11. Supplier Selection

Supplier selection is represented by two fields on `Process`:

```text
selectedSupplierId
supplierJustification
```

This is deliberately distinct from quotations.

Quotations describe the offers received.

The selected supplier represents the result of the process.

The justification records why that supplier was selected.

Example:

```text
Selected supplier:
Empresa ABC Ltda.

Justification:
Fornecedor apresentou a menor proposta compatível
com as especificações requeridas.
```

---

## 12. Document

A `Document` represents a file associated with a procurement process.

### Main attributes

- `id`
- `processId`
- `type`
- `filename`
- `storageKey`
- `mimeType`
- `size`
- `uploadedById`
- `createdAt`

The database stores metadata and a storage reference rather than the binary file itself.

This allows the application to use local storage during development and potentially move to object storage later without changing the domain model.

### Document types

The `DocumentType` enum contains:

```text
DEMANDA
PESQUISA_PRECOS
JUSTIFICATIVA_PRECO
RAZAO_ESCOLHA_FORNECEDOR
DOCUMENTACAO_FORNECEDOR
PARECER_JURIDICO
TERMO_REFERENCIA
OUTRO
```

The MVP uses a fixed application-level checklist rather than a configurable document-requirement database model.

---

## 13. Approval

An `Approval` represents an approval decision made by an authorized user.

### Main attributes

- `id`
- `processId`
- `userId`
- `decision`
- `comment`
- `createdAt`

The `ApprovalDecision` enum contains:

```text
APPROVED
REJECTED
```

An approval records:

- which process was evaluated;
- which user made the decision;
- the decision;
- an optional comment;
- the timestamp.

For rejection, the application requires a reason.

Approval operations should update the process, create the approval record, and create the corresponding audit record within a database transaction.

---

## 14. AuditLog

`AuditLog` provides the process history.

### Main attributes

- `id`
- `processId`
- `userId`
- `action`
- `description`
- `createdAt`

The `AuditAction` enum contains:

```text
PROCESS_CREATED
PROCESS_UPDATED
PROCESS_SUBMITTED
QUOTATION_ADDED
QUOTATION_UPDATED
SUPPLIER_SELECTED
DOCUMENT_UPLOADED
PROCESS_SENT_FOR_APPROVAL
PROCESS_APPROVED
PROCESS_REJECTED
PROCESS_COMPLETED
```

Example history:

```text
15/08/2026 08:31
João Silva created the process.

15/08/2026 09:12
Maria Oliveira added a quotation of R$ 42,000.

15/08/2026 09:45
Maria Oliveira selected Empresa ABC.

15/08/2026 10:15
Maria Oliveira submitted the process for approval.

15/08/2026 11:03
Carlos Souza approved the process.
```

The audit log is intended to provide traceability for relevant actions.

---

## 15. Domain Invariants

The following rules are fundamental to the domain.

### Process completeness

A process cannot be submitted without the required basic information.

### Status transitions

Processes may only move through valid workflow transitions.

For example:

```text
DRAFT → IN_ANALYSIS
```

is valid, while:

```text
DRAFT → APPROVED
```

is not.

### Quotation requirement

The MVP requires at least three quotations before supplier selection.

### Supplier requirement

A process cannot be submitted for approval without a selected supplier.

### Supplier justification

A supplier selection requires a written justification.

### Document requirement

A process cannot be submitted for approval while applicable required documents are missing.

### Approval authorization

Only users with the `APROVADOR` role may approve or reject a process.

### Rejection reason

A rejection must contain a reason.

### Approved process integrity

An approved process cannot be casually edited through the normal editing workflow.

### Auditability

Relevant process actions must generate audit records.

---

## 16. Domain Boundaries

The following concerns are explicitly outside the Phase 1 domain model:

- PNCP integration
- supplier bidding interfaces
- electronic signatures
- payment processing
- accounting integration
- contract execution
- invoice management
- automatic legal interpretation
- automatic determination of whether a case qualifies as a dispensa
- multi-tenant organization management
- advanced document workflow
- government authentication integrations

These may be considered future extensions but are not part of the MVP.

---

## 17. Prisma-to-Domain Mapping

The current Prisma schema maps directly to the domain as follows:

| Prisma model | Domain concept            |
| ------------ | ------------------------- |
| `User`       | System user / actor       |
| `Department` | Organizational department |
| `Process`    | Procurement process       |
| `Supplier`   | Supplier/provider         |
| `Quotation`  | Supplier quotation        |
| `Document`   | Process document          |
| `Approval`   | Approval decision         |
| `AuditLog`   | Process history           |

The principal enums are:

| Enum               | Purpose                    |
| ------------------ | -------------------------- |
| `UserRole`         | User authorization role    |
| `ProcessStatus`    | Process workflow state     |
| `ApprovalDecision` | Approval result            |
| `DocumentType`     | Document classification    |
| `AuditAction`      | Audit event classification |

---

## 18. Domain Model Summary

The complete domain can be summarized as:

```text
                              ┌──────────────┐
                              │     User     │
                              └──────┬───────┘
                                     │
                              belongs to
                                     │
                              ┌──────▼───────┐
                              │  Department  │
                              └──────┬───────┘
                                     │
                                  owns
                                     │
                              ┌──────▼───────┐
                              │    Process   │
                              └──────┬───────┘
                                     │
              ┌──────────────────────┼────────────────────────┐
              │                      │                        │
              ▼                      ▼                        ▼
       ┌────────────┐         ┌────────────┐          ┌────────────┐
       │ Quotation  │         │  Document  │          │  Approval  │
       └──────┬─────┘         └────────────┘          └────────────┘
              │
              ▼
        ┌────────────┐
        │  Supplier  │
        └────────────┘

                              Process
                                 │
                                 ▼
                            ┌───────────┐
                            │ AuditLog  │
                            └───────────┘
```

---

## 19. Phase 1 Definition of Done

Phase 1 — Domain is considered complete when:

- The principal actors have been identified.
- The core domain entities have been identified.
- Relationships between entities have been established.
- Process states have been defined.
- Domain invariants have been documented.
- Supplier selection has been modeled separately from quotations.
- Process documents have been modeled.
- Approval decisions have been modeled.
- Auditability has been modeled.
- The domain boundaries of the MVP have been established.
- The Prisma schema reflects the resulting domain model.

The resulting domain is intentionally small enough for a university project while still representing a realistic internal workflow for managing a simplified dispensa de licitação.
