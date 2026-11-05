# Manual Testing Guide: Phase 4 Internal Approval Workflow

This document provides a comprehensive guide for manually verifying the **Phase 4 Internal Analysis and Approval Workflow** in the PI-II Sistema de Dispensa de Licitações. It covers environment configuration, seed scripts, demo user credentials, pre-seeded workflow scenarios, and end-to-end test scenarios (Tests A through H).

---

## 1. Environment Setup & Configuration

### Prerequisites

- Node.js `v20+` (LTS recommended)
- PostgreSQL running locally on port `5432` (or via Docker Compose: `npm run docker:dev:up`)
- Database migrations up to date (`npm run db:migrate`)

### Configuration Variables

The seeding and workflow test suites respect the following environment variables (defined in `.env.development` or `.env.local`):

| Variable              | Default (Dev)              | Description                                                |
| --------------------- | -------------------------- | ---------------------------------------------------------- |
| `SEED_ADMIN_NAME`     | `Administrador do Sistema` | Full name of the root administrator account                |
| `SEED_ADMIN_EMAIL`    | `admin@sisd.gov.br`        | Unique email for the system administrator                  |
| `SEED_ADMIN_PASSWORD` | `Admin@123456`             | Password for administrator provisioning                    |
| `SEED_DEMO_PASSWORD`  | `Demo@123456`              | Password applied to all 7 demo accounts                    |
| `ENABLE_DEMO_SEED`    | `false`                    | Explicit opt-in safety flag required to populate demo data |

> [!IMPORTANT]
> **Safety Guards**: Demo seeding scripts will **refuse to execute** in `NODE_ENV=production`. In non-production environments, they require explicit confirmation via `ENABLE_DEMO_SEED=true` or passing the `--force` / `--yes` CLI argument.

---

## 2. Available Seeding Commands

The repository provides granular and all-in-one npm scripts for provisioning development data:

| Command                              | Environment        | Description                                                                     |
| ------------------------------------ | ------------------ | ------------------------------------------------------------------------------- |
| `npm run db:seed:admin:dev`          | `.env.development` | Provisions the default system administrator account. Idempotent.                |
| `npm run db:seed:demo-users:dev`     | `.env.development` | Provisions 2 departments and 7 demo users across all roles. Idempotent.         |
| `npm run db:seed:demo-scenarios:dev` | `.env.development` | Provisions 3 suppliers and 6 Phase 4 procurement scenarios. Idempotent.         |
| `npm run db:seed:all:dev`            | `.env.development` | **One-step setup**: Executes admin, demo users, and demo scenarios in sequence. |

To populate a fresh development database, simply run:

```bash
npm run db:seed:all:dev
```

---

## 3. Demo User Accounts & Roles

All demo accounts are created with password: **`Demo@123456`** (unless overridden via `SEED_DEMO_PASSWORD`).

| Email                     | Role                 | Department                  | Scope & Purpose                                                        |
| ------------------------- | -------------------- | --------------------------- | ---------------------------------------------------------------------- |
| `admin@sisd.local`        | `ADMIN`              | None (`null`)               | Global administrative oversight; read-only during active workflow      |
| `solicitante@sisd.local`  | `SOLICITANTE`        | Secretaria de Administração | Department requester; creates DFDs, items, quotes, and submits         |
| `agente@sisd.local`       | `AGENTE_CONTRATACAO` | Secretaria de Administração | Stage 1 Procurement Agent; reviews technical instruction & quotations  |
| `aprovador@sisd.local`    | `APROVADOR`          | Secretaria de Administração | Stage 2 Approver; issues final internal approval or terminal rejection |
| `solicitante2@sisd.local` | `SOLICITANTE`        | Secretaria de Saúde         | Department requester for cross-department isolation testing            |
| `agente2@sisd.local`      | `AGENTE_CONTRATACAO` | Secretaria de Saúde         | Stage 1 Procurement Agent for cross-department isolation testing       |
| `aprovador2@sisd.local`   | `APROVADOR`          | Secretaria de Saúde         | Stage 2 Approver for cross-department isolation testing                |

---

## 4. Pre-Seeded Workflow Scenarios

When `npm run db:seed:demo-scenarios:dev` is executed, the following 6 processes are provisioned under **Secretaria de Administração**:

| Process Number  | Title                                           | Status                    | Current Stage / Workflow State                                                      |
| --------------- | ----------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------- |
| **DP-001/2026** | Aquisição de Papel A4 e Materiais de Escritório | `DRAFT`                   | Editable draft; has DFD, items, and quotes; ready for submission.                   |
| **DP-002/2026** | Contratação de Serviços de Manutenção Predial   | `IN_ANALYSIS`             | **Stage 1 (Technical Analysis)**: Submitted; pending task for `AGENTE_CONTRATACAO`. |
| **DP-003/2026** | Aquisição de Equipamentos de Informática        | `AWAITING_APPROVAL`       | **Stage 2 (Internal Approval)**: Stage 1 approved; pending task for `APROVADOR`.    |
| **DP-004/2026** | Serviços de Limpeza e Conservação               | `RETURNED_FOR_ADJUSTMENT` | Returned in Cycle 1 with agent notes; editable by requester for resubmission.       |
| **DP-005/2026** | Fornecimento de Café e Insumos de Copa          | `APPROVED`                | **Terminal Approved**: Both stages 1 & 2 approved; ready for Phase 5 publication.   |
| **DP-006/2026** | Aquisição de Mobiliário Corporativo             | `REJECTED`                | **Terminal Rejected**: Formally rejected at Stage 2 with auditable justification.   |

---

## 5. Step-by-Step Manual Test Procedures

Start the development server:

```bash
npm run dev
```

Navigate to `http://localhost:3000` in your web browser.

---

### Test A: Initial Submission and Technical Analysis

**Goal:** Verify that a requester can submit a complete draft and that a procurement agent receives it in their review queue.

1. **Sign In as Requester**:
   - URL: `/login`
   - Email: `solicitante@sisd.local` | Password: `Demo@123456`
2. **Access Draft Process**:
   - Open process **DP-001/2026** (`/processos` -> select DP-001/2026).
   - Verify status is `DRAFT`.
   - Inspect items, estimated value, quotation summary, and legal justification.
3. **Submit for Analysis**:
   - Click the **"Submeter para Análise"** button.
   - Confirm the submission modal dialog.
   - **Expected Outcome:**
     - Status changes to `IN_ANALYSIS`.
     - Process details become read-only for the requester.
     - A banner indicates that the process is under technical analysis.
4. **Sign In as Procurement Agent**:
   - Log out and sign in with `agente@sisd.local` | `Demo@123456`.
5. **Inspect Review Queue**:
   - Access `/processos`. Process DP-001/2026 now displays badge `IN_ANALYSIS`.
   - Open DP-001/2026.
   - **Expected Outcome:**
     - Agent sees the review panel: **"Aprovar Etapa"**, **"Solicitar Ajustes"**, **"Rejeitar Processo"**.
     - Agent can inspect supplier quotes, justifications, and attached documents.

---

### Test B: Stage 1 Adjustment Request and Resubmission Cycle

**Goal:** Verify that a procurement agent can return a process for corrections and that the requester can adjust and resubmit it under a new cycle.

1. **Sign In as Procurement Agent**:
   - Log in with `agente@sisd.local`.
   - Open process **DP-002/2026** (currently in `IN_ANALYSIS`).
2. **Request Adjustment**:
   - Click **"Solicitar Ajustes"**.
   - Enter justification: _"Favor anexar a justificativa detalhada para a escolha do fornecedor com menor preço."_
   - Confirm the action.
   - **Expected Outcome:**
     - Process status transitions to `RETURNED_FOR_ADJUSTMENT`.
     - Stage 1 pending task is marked as completed with decision `RETURNED_FOR_ADJUSTMENT`.
     - Agent action buttons are disabled.
3. **Sign In as Requester**:
   - Log in with `solicitante@sisd.local`.
   - Open DP-002/2026.
   - **Expected Outcome:**
     - Warning banner displays the return notice and agent's notes.
     - Editing permissions are restored for the requester.
4. **Make Corrections & Resubmit**:
   - Modify the legal justification or quotation notes.
   - Click **"Reenviar para Análise"**.
   - **Expected Outcome:**
     - Process status transitions back to `IN_ANALYSIS`.
     - Approval cycle increments from `1` to `2`.
     - A new pending `ANALYSIS` task is created for cycle 2.
     - Previous cycle 1 decision and notes remain preserved in the audit history.

---

### Test C: Successful Two-Stage Approval

**Goal:** Verify sequential approval through Stage 1 (`AGENTE_CONTRATACAO`) and Stage 2 (`APROVADOR`).

1. **Stage 1 Technical Approval**:
   - Log in with `agente@sisd.local`.
   - Open **DP-002/2026** (or an active `IN_ANALYSIS` process).
   - Click **"Aprovar Etapa"**.
   - Enter dispatch notes: _"Instrução técnica concluída com êxito. Encaminho para autorização da autoridade competente."_
   - Confirm approval.
   - **Expected Outcome:**
     - Process status transitions to `AWAITING_APPROVAL`.
     - Stage 1 task is completed with `decision = "APPROVED"`.
     - Stage 2 task (`stage = "APPROVAL"`, `assignedRole = "APROVADOR"`) is created with status `PENDING`.
2. **Stage 2 Final Approval**:
   - Log out and log in with `aprovador@sisd.local`.
   - Open `/processos` -> select DP-002/2026.
   - Verify that Stage 1 dispatch and notes are visible in the workflow history.
   - Click **"Aprovar Processo"**.
   - Enter formal approval: _"Autorizo a contratação direta por dispensa nos termos do Art. 75, II da Lei 14.133/2021."_
   - Confirm approval.
   - **Expected Outcome:**
     - Process status transitions to `APPROVED`.
     - Stage 2 task is completed with `decision = "APPROVED"`.
     - Both approval decisions appear chronologically in the timeline with reviewer names and timestamps.

---

### Test D: Rejection and Terminal Closure

**Goal:** Verify that an approver can formally reject a process, locking it permanently.

1. **Sign In as Approver**:
   - Log in with `aprovador@sisd.local`.
   - Open **DP-003/2026** (currently in `AWAITING_APPROVAL`).
2. **Execute Rejection**:
   - Click **"Rejeitar Processo"**.
   - Enter reason: _"Indefiro o pedido por ausência de dotação orçamentária compatível para o exercício corrente."_
   - Confirm rejection.
   - **Expected Outcome:**
     - Process status transitions to `REJECTED`.
     - Pending task is completed with `decision = "REJECTED"`.
     - The process enters a terminal closed state: no resubmission button is available, and all fields are permanently locked.
     - Rejection reason is prominently displayed on the process overview.

---

### Test E: Cross-Department Isolation

**Goal:** Verify that staff from one department cannot review or approve processes belonging to another department.

1. **Sign In as Health Department Reviewer**:
   - Log in with `agente2@sisd.local` or `aprovador2@sisd.local` (`Secretaria de Saúde`).
2. **Attempt Review on Administration Department Process**:
   - Attempt to access process DP-002/2026 (`Secretaria de Administração`).
   - If direct URL `/processos/<id-do-processo-adm>` is requested:
     - Process details are either hidden or access is blocked.
   - If attempting to post an approval decision via API (`POST /api/processes/:id/approvals`):
     - **Expected Outcome:** Server responds with **`403 Forbidden`** (`"Usuário não tem permissão para atuar em processos de outro departamento"`).
3. **Department Scoped Listing**:
   - Verify that `/processos` shows only processes belonging to `Secretaria de Saúde`.

---

### Test F: Administrator Oversight & Read-Only Invariant

**Goal:** Verify that an `ADMIN` can view all processes across departments but cannot modify data or bypass workflow steps during active review.

1. **Sign In as Administrator**:
   - Log in with `admin@sisd.local` (or `admin@sisd.gov.br`).
2. **Inspect Cross-Department Processes**:
   - Access `/processos`.
   - Verify that processes from both `Secretaria de Administração` and `Secretaria de Saúde` are visible.
3. **Verify Read-Only Enforcement during Active Review**:
   - Open DP-002/2026 (`IN_ANALYSIS`) or DP-003/2026 (`AWAITING_APPROVAL`).
   - **Expected Outcome:**
     - The administrator **cannot** edit quotations, justifications, or metadata.
     - The workflow decision buttons (**"Aprovar"**, **"Rejeitar"**) are **not available** to the administrator.
     - Direct API calls to mutate approval tasks as `ADMIN` return **`403 Forbidden`**.

---

### Test G: Self-Review Prevention (Segregation of Duties)

**Goal:** Ensure that the user who requested a process cannot approve or instruct their own process.

1. **Scenario Setup**:
   - User `solicitante@sisd.local` created DP-001/2026.
2. **Attempt Decision Action**:
   - Attempt to execute an approval API call (`POST /api/processes/:id/approvals`) authenticated as `solicitante@sisd.local`.
   - **Expected Outcome:**
     - Server fails closed with **`403 Forbidden`** or **`400 Bad Request`** (role mismatch and self-review restriction enforced).

---

### Test H: Concurrency and Duplicate Decision Prevention

**Goal:** Ensure that multiple reviewers or concurrent actions on the same task do not create duplicate transitions or corrupt cycle state.

1. **Scenario**:
   - Open DP-002/2026 in two separate browser tabs (or windows) logged in as `agente@sisd.local`.
2. **Trigger Concurrent Actions**:
   - In Tab 1, submit **"Aprovar Etapa"**.
   - In Tab 2, immediately click **"Solicitar Ajustes"**.
3. **Expected Outcome**:
   - The first request completes successfully (moving to `AWAITING_APPROVAL`).
   - The second request fails with **`409 Conflict`** or **`400 Bad Request`** indicating that the pending task was already decided or the process state has changed.
   - Database remains consistent: exactly one completed task for Stage 1, Cycle 1.
