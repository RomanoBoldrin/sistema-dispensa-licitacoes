# Phase 5 — Procurement Finalization, Publication, and Transparency

This document specifies the architecture, data models, responsibility model, and domain rules for **Phase 5: Authorization, Publication, and Transparency** in the PI-II Sistema de Dispensa de Licitações.

---

## 1. Domain Overview & Responsibility Model

Phase 4 implemented internal analysis and approval (`IN_ANALYSIS` → `AWAITING_APPROVAL` → `APPROVED`).

Phase 5 introduces two subsequent, distinct administrative responsibilities:

1. **Final Authorization by the Competent Authority (`AUTORIDADE_COMPETENTE`)**: Formal administrative approval, refusal, or request for adjustment on internally approved procurement processes.
2. **Publication Registration and Evidence (`AGENTE_CONTRATACAO`)**: Recording official publication vehicles, dates, reference numbers, and supporting documents.

### Role Responsibility Matrix

| Role                    | Domain Responsibility in Workflow                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SOLICITANTE`           | Creates DFD, items, quotations, and submits procurement demands (`DRAFT` / `RETURNED_FOR_ADJUSTMENT` → `IN_ANALYSIS`).                                                                            |
| `AGENTE_CONTRATACAO`    | Conducts technical instruction/analysis (`IN_ANALYSIS` → `AWAITING_APPROVAL`), requests adjustments, and registers publication data (`AWAITING_PUBLICATION` → `COMPLETED`).                       |
| `APROVADOR`             | Performs internal approval (`AWAITING_APPROVAL` → `APPROVED`), requests adjustments, or issues terminal rejection (`REJECTED`).                                                                   |
| `AUTORIDADE_COMPETENTE` | Grants final authorization (`AWAITING_FINAL_AUTHORIZATION` → `AWAITING_PUBLICATION`), refuses authorization (`FINAL_AUTHORIZATION_REFUSED`), or requests adjustments (`RETURNED_FOR_ADJUSTMENT`). |
| `ADMIN`                 | Global system administration (users, settings, oversight) without procurement decision authority. Cannot substitute for the competent authority.                                                  |

---

## 2. Process Lifecycle & State Transitions

Phase 5 extends the procurement lifecycle with explicit, non-arbitrary transitions:

```
[APPROVED] (Phase 4 completed)
    │
    ▼
[AWAITING_FINAL_AUTHORIZATION]
    ├── (Authorized) ──────────────► [AWAITING_PUBLICATION] ──► [COMPLETED]
    ├── (Refused) ────────────────► [FINAL_AUTHORIZATION_REFUSED] (Terminal)
    └── (Adjustment Requested) ────► [RETURNED_FOR_ADJUSTMENT]
                                           │
                                           ▼ (Resubmission restart)
                                     [IN_ANALYSIS]
```

### Transition Semantics

1. **Internal Approval Completed (`APPROVED`)**:
   - Represents completion of Phase 4 review.
   - Remains distinct from final authorization.
   - Moves to `AWAITING_FINAL_AUTHORIZATION` when initiated for executive review.

2. **Final Authorization Granted (`AWAITING_PUBLICATION`)**:
   - The competent authority authorizes the direct award.
   - Transitions process to `AWAITING_PUBLICATION`.

3. **Final Authorization Refused (`FINAL_AUTHORIZATION_REFUSED`)**:
   - The competent authority formally refuses authorization with mandatory justification.
   - Transitions process to terminal `FINAL_AUTHORIZATION_REFUSED`.
   - Distinct from Phase 4 internal rejection (`REJECTED`).

4. **Adjustments Requested (`RETURNED_FOR_ADJUSTMENT`)**:
   - If the competent authority requires corrections, the process returns to `RETURNED_FOR_ADJUSTMENT`.
   - Must strictly restart the standard review cycle via requester resubmission (`IN_ANALYSIS` → `AWAITING_APPROVAL` → `APPROVED`).
   - No shortcuts directly back to final authorization.

5. **Completion (`COMPLETED`)**:
   - Reached from `AWAITING_PUBLICATION` once valid publication information and supporting evidence have been registered.

---

## 3. Data Models

### 3.1 FinalAuthorization Model

Represents completed final authorization decisions issued by the competent authority.

```prisma
enum FinalAuthorizationDecision {
  AUTHORIZED
  REFUSED
  ADJUSTMENT_REQUESTED
}

model FinalAuthorization {
  id            String                     @id @default(uuid()) @db.Uuid
  processId     String                     @db.Uuid
  process       Process                    @relation(fields: [processId], references: [id])

  userId        String                     @db.Uuid
  user          User                       @relation(fields: [userId], references: [id])

  decision      FinalAuthorizationDecision
  justification String?
  decidedAt     DateTime                   @default(now())
  cycle         Int                        @default(1)

  createdAt     DateTime                   @default(now())
  deletedAt     DateTime?

  @@index([processId, cycle])
  @@index([userId])
  @@index([decision])
  @@index([decidedAt])
}
```

#### Architectural Decisions: Decision-Only Model vs. Task Model

- **Decision-Only Ledger**: Unlike Phase 4 `Approval`, which manages two alternating roles (`AGENTE_CONTRATACAO` and `APROVADOR`) across a multi-stage workflow, Final Authorization is a single formal act of executive authorization by `AUTORIDADE_COMPETENTE`.
- Pending state is represented directly by `Process.status = 'AWAITING_FINAL_AUTHORIZATION'`.
- `userId`, `decision`, and `decidedAt` are strictly `NOT NULL` in the database, guaranteeing accountability and attribution without nullable decision fields.
- **Cycle Integrity**: `UNIQUE ("processId", "cycle") WHERE "deletedAt" IS NULL` prevents conflicting duplicate decisions in the same workflow cycle while preserving complete cycle history.
- **Database CHECK Constraint (`chk_final_auth_justification`)**: Database-enforced rule requiring non-empty `justification` whenever `decision` is `REFUSED` or `ADJUSTMENT_REQUESTED`.

### 3.2 PublicationRecord Model

Represents official publication information and supporting evidence.

```prisma
enum PublicationType {
  DIRECT_AWARD_NOTICE
  AUTHORIZATION_EXTRACT
  CONTRACT_EXTRACT
  OTHER
}

model PublicationRecord {
  id              String          @id @default(uuid()) @db.Uuid
  processId       String          @db.Uuid
  process         Process         @relation(fields: [processId], references: [id])

  publicationType PublicationType
  destination     String
  publishedAt     DateTime
  referenceNumber String?
  url             String?

  documentId      String?         @db.Uuid
  document        Document?       @relation(fields: [documentId], references: [id])

  createdById     String          @db.Uuid
  createdBy       User            @relation(fields: [createdById], references: [id])

  createdAt       DateTime        @default(now())
  deletedAt       DateTime?

  @@index([processId])
  @@index([createdById])
  @@index([publicationType])
  @@index([publishedAt])
  @@index([documentId])
}
```

#### Academic Simulation & Scope Assumptions

- **No Live PNCP Integration**: Real-world external platform API calls (e.g. PNCP REST API) are simulated. Publication records represent verified metadata and uploaded proof documents (e.g. DOE extracts, institutional portal links, or simulated PNCP notice receipts).
- **Extensible Publication Types**: Supports `DIRECT_AWARD_NOTICE` (Art. 75, § 3º), `AUTHORIZATION_EXTRACT` (Art. 72, parágrafo único), `CONTRACT_EXTRACT` (Art. 94), and `OTHER`.
- **Database CHECK Constraint (`chk_publication_destination_not_empty`)**: Enforces non-empty vehicle destination string at the schema level.

---

## 4. Role Scoping & Authorization Rules

1. **Department Isolation**: `AUTORIDADE_COMPETENTE` is strictly department-scoped. An authority assigned to `Secretaria de Administração` cannot review or authorize processes belonging to `Secretaria de Saúde`.
2. **Fail-Closed Policy**: A user with `departmentId: null` or mismatched department is strictly forbidden from acting on any process.
3. **Segregation of Duties**: An authority cannot authorize a procurement process that they originally requested (`requesterId === user.id`).
4. **Administrative Oversight Boundary**: `ADMIN` has system management scope, but cannot grant final authorizations or bypass competent authorities.

---

## 5. Audit Trail Integration

The audit trail records all Phase 5 lifecycle milestones via `AuditLog`:

| Action Enum                                | When Emitted                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| `FINAL_AUTHORIZATION_INITIATED`            | When process moves from `APPROVED` to `AWAITING_FINAL_AUTHORIZATION`.           |
| `FINAL_AUTHORIZATION_GRANTED`              | When competent authority authorizes the process (`AWAITING_PUBLICATION`).       |
| `FINAL_AUTHORIZATION_REFUSED`              | When competent authority refuses authorization (`FINAL_AUTHORIZATION_REFUSED`). |
| `FINAL_AUTHORIZATION_ADJUSTMENT_REQUESTED` | When competent authority requests adjustments (`RETURNED_FOR_ADJUSTMENT`).      |
| `PUBLICATION_REGISTERED`                   | When publication record and evidence are registered.                            |
| `PUBLICATION_SUPERSEDED`                   | When publication record is corrected or replaced with updated evidence.         |
| `PROCESS_COMPLETED`                        | When process achieves final completion state (`COMPLETED`).                     |

---

## 6. Development Seed Accounts

Development seeding (`scripts/seed-demo-users.mjs`) provisions `AUTORIDADE_COMPETENTE` demo accounts:

| Email                    | Role                    | Department                  | Password (Default) |
| ------------------------ | ----------------------- | --------------------------- | ------------------ |
| `autoridade@sisd.local`  | `AUTORIDADE_COMPETENTE` | Secretaria de Administração | `Demo@123456`      |
| `autoridade2@sisd.local` | `AUTORIDADE_COMPETENTE` | Secretaria de Saúde         | `Demo@123456`      |

---

## 7. Milestone Scope & Boundaries

### Completed in Phase 5.1 & Phase 5.1.1 (Database and Domain Foundation)

- Prisma schema, enums (`UserRole.AUTORIDADE_COMPETENTE`, `ProcessStatus`, `FinalAuthorizationDecision`, `PublicationType`, `AuditAction`).
- Database migration `20261105210000_phase_5_1_finalization_publication_foundation` with foreign keys, indexes, and database check constraints.
- Centralized domain workflow foundation (`src/domain/process-lifecycle.js`) with explicit transition matrix and role guards.
- Development seeder updates for competent authority accounts across demo departments.
- Unit and integration tests covering domain lifecycle, authorization rules, database constraints, and regression.

### Completed in Phase 5.2 (Final Authorization Backend)

- **Dedicated Service Layer**: `src/services/final-authorization.service.js` implementing:
  - `initiateFinalAuthorization(processId, user)`: Explicitly triggered by `AGENTE_CONTRATACAO` for an `APPROVED` process in their department.
  - `listPendingFinalAuthorizations(user, filters)`: Department-isolated decision inbox for `AUTORIDADE_COMPETENTE`.
  - `getFinalAuthorizationDetails(processId, user)`: Comprehensive audit history distinguishing historical decisions from active cycle state.
  - `authorizeProcess(processId, user, payload)`: Grants authorization, moves process to `AWAITING_PUBLICATION`, and records `FINAL_AUTHORIZATION_GRANTED`.
  - `refuseFinalAuthorization(processId, user, payload)`: Refuses authorization with mandatory justification (≥ 10 chars), moves process to terminal `FINAL_AUTHORIZATION_REFUSED`, and records `FINAL_AUTHORIZATION_REFUSED`.
  - `requestFinalAuthorizationAdjustments(processId, user, payload)`: Requests adjustments with mandatory justification (≥ 10 chars), moves process to `RETURNED_FOR_ADJUSTMENT`, and records `FINAL_AUTHORIZATION_ADJUSTMENT_REQUESTED`.
- **API Endpoints**:
  - `POST /api/v1/processes/:id/final-authorization/initiate`
  - `GET /api/v1/final-authorizations`
  - `GET /api/v1/processes/:id/final-authorization`
  - `POST /api/v1/processes/:id/final-authorization/authorize`
  - `POST /api/v1/processes/:id/final-authorization/refuse`
  - `POST /api/v1/processes/:id/final-authorization/request-adjustments`
- **Transaction & Concurrency Guarantees**:
  - Every decision and initiation mutation executes within an atomic `prisma.$transaction`.
  - Pessimistic status verification inside transactions ensures stale requests cannot mutate processes.
  - Dual-layer conflict protection: application-level cycle checks combined with PostgreSQL partial unique index `idx_final_auth_active_cycle_unique` (`P2002` error handling) guarantee that concurrent duplicate decisions are safely rejected.
- **Workflow Cycle Synchronization**:
  - Authoritative cycle calculation through `calculateNextWorkflowCycle` ensures that adjustments return through Phase 4 review in cycle 2 without conflicting with cycle 1 decisions.
- **Segregation of Duties & Fail-Closed Department Isolation**:
  - `canUserActOnFinalAuthorization` and `canUserInitiateFinalAuthorization` prevent users from acting on processes they requested (`requesterId === user.id`).
  - Users without an assigned department or belonging to a different department are strictly rejected.
  - `ADMIN` cannot act as competent authority or access the decision inbox.

### Completed in Phase 5.3 (Publication Registration & Process Completion Backend)

- **Dedicated Service Layer**: `src/services/publication.service.js` implementing:
  - `registerPublication(processId, user, payload)`:
    - Authoritative actor: `AGENTE_CONTRATACAO` belonging to the process department.
    - Department isolation: fail-closed enforcement; cross-department access is forbidden (`ForbiddenError`).
    - Segregation of duties: agents who originally requested the procurement process cannot register publication (`ForbiddenError`).
    - Process status precondition: strictly requires `AWAITING_PUBLICATION` (`ConflictError` otherwise).
    - Executive authorization verification: checks that a valid `FinalAuthorization` with `decision === 'AUTHORIZED'` exists in the active workflow cycle.
    - Publication payload validation: validates `publicationType`, non-empty trimmed `destination`, contemporary date (rejects future dates and years < 2000), valid URL (http/https protocols), and optional `referenceNumber`.
    - Document evidence validation: validates optional `documentId`, confirming existence in `Document`, ownership (`document.processId === processId`), and active status (`!deletedAt && isActive`).
    - State machine advancement: advances status `AWAITING_PUBLICATION -> COMPLETED` via optimistic conditional locking (`updateMany`).
    - Atomic audit ledger: emits `PUBLICATION_REGISTERED` and `PROCESS_COMPLETED` events in the same database transaction.
  - `listPublications(processId, user)`:
    - Returns reverse chronological list of publication records for a process.
    - Department-scoped: accessible to department members, process requester, and `ADMIN`.
    - Sanitized metadata: includes attached document details while suppressing raw storage keys or internal filesystem paths.
  - `getPublicationDetails(publicationId, user)`:
    - Returns detailed publication record and attached active document metadata.
    - Enforces department isolation and returns consistent 404 for nonexistent records.
- **API Endpoints**:
  - `POST /api/v1/processes/:processId/publications`: registers official publication and completes the process (HTTP 201).
  - `GET /api/v1/processes/:processId/publications`: returns publication history for a process (HTTP 200).
  - `GET /api/v1/publications/:publicationId`: returns specific publication record details (HTTP 200).
- **Concurrency & Append-Only Guarantees**:
  - Publication records are append-only. No deletion or mutation endpoints are provided.
  - Concurrency protection via conditional update (`where: { id, status: 'AWAITING_PUBLICATION' }, data: { status: 'COMPLETED' }`) guarantees that concurrent requests cannot duplicate completion or corrupt state.
- **Academic Simulation Boundary**:
  - Publication information represents an internal administrative simulation for demonstration of Lei nº 14.133/2021.
  - No live network requests are made to external portals (such as PNCP or municipal official gazettes).

### Completed in Phase 5.4 (Finalization Frontend Implementation)

- **Dedicated Navigation & Inbox Pages**:
  - `/final-authorizations`: Executive decision inbox exclusively for `AUTORIDADE_COMPETENTE`. Lists pending processes (`AWAITING_FINAL_AUTHORIZATION`) with pagination, search, responsive table/card layout, refresh, empty, and error retry states.
  - `/publications`: Dedicated management module for `AGENTE_CONTRATACAO` and staff. Provides filtered listings ("Aguardando Publicação (Prioridade)", "Processos Concluídos", "Todos") with direct action shortcuts.
- **Process Details Tab Integration (`/processes/[processId]`)**:
  - `FinalAuthorizationTab.jsx`:
    - Initiation workflow for `AGENTE_CONTRATACAO` on `APPROVED` processes with modal confirmation and explanatory guidance.
    - Full executive audit dossier displaying DFD object, legal classification with legal basis & justification, selected supplier and comparative quotations summary, attached documentation, Phase 4 internal approval history, and prior final authorization cycles.
    - Explicit authority actions: **Autorizar** (transitions to `AWAITING_PUBLICATION`), **Recusar** (mandatory justification $\ge 10$ chars, transitions to terminal `FINAL_AUTHORIZATION_REFUSED`), and **Solicitar Ajustes** (mandatory justification $\ge 10$ chars, transitions to `RETURNED_FOR_ADJUSTMENT`).
    - Segregation of duties awareness: warns authority if they originally requested the process and disables decision buttons.
  - `PublicationTab.jsx`:
    - Prominent simulation disclaimer banner: clearly informs users that publication records are recorded strictly for academic and demonstration purposes of Lei nº 14.133/2021, and that no external network calls to PNCP or municipal official gazettes occur.
    - Publication registration form for `AGENTE_CONTRATACAO` on `AWAITING_PUBLICATION` status with validation for publication type, destination vehicle, contemporary date, optional reference number, optional external URL, and optional document evidence attachment (with inline file upload support).
    - Completion warning modal: clearly informs the agent that registering the publication marks the procurement process as `COMPLETED`.
    - Reverse-chronological publication history view with attached document download links and formatted dates.
- **Role-Aware Sidebar & Dashboard Overview**:
  - `DashboardSidebar.jsx`: Dynamic navigation items showing pending badge counters for `AUTORIDADE_COMPETENTE` ("Autorizações Finais") and `AGENTE_CONTRATACAO` ("Módulo de Publicação").
  - `DashboardOverview.jsx`: Attention cards and KPI statistics tailored to the authenticated user's role (directing authorities to `/final-authorizations` and procurement agents to `/publications`).
  - `WorkflowStepper`: Full 6-step lifecycle visual stepper (DFD → Cotações → Justificativa Legal → Aprovação Técnica → Autorização Final → Publicação e Conclusão) with terminal badge indicators (`FINAL_AUTHORIZATION_REFUSED`, `RETURNED_FOR_ADJUSTMENT`, `REJECTED`, `COMPLETED`).
- **Comprehensive Quality Assurance**:
  - Unit test suite (`src/tests/unit/finalizationFrontend.test.js`) verifying label dictionaries, decision validation guards, publication payload checks, and role authorization logic.
  - End-to-end integration suite (`src/tests/integration/workflow/finalization-frontend-integration.test.js`) verifying the complete simulated lifecycle across dashboard metrics, initiation, executive authorization/refusal/adjustments, publication registration, and history queries.
