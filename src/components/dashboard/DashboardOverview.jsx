import Link from "next/link";
import DashboardStatCard from "./DashboardStatCard";
import ProcessStatusChart from "./ProcessStatusChart";
import DepartmentDistributionChart from "./DepartmentDistributionChart";
import RecentProcessesTable from "./RecentProcessesTable";
import ProcessLifecycleGuide from "./ProcessLifecycleGuide";
import { formatCurrency, ROLE_LABELS } from "./dashboardUtils";

export default function DashboardOverview({
  data,
  user,
  isLoading = false,
  error = null,
  onRefresh,
}) {
  const summary = data?.summary || {
    totalProcesses: 0,
    inProgress: 0,
    awaitingApproval: 0,
    completed: 0,
    drafts: 0,
    rejected: 0,
    totalEstimatedValue: 0,
    approvedEstimatedValue: 0,
    attentionCount: 0,
    attentionDescription: "",
  };

  const statusDistribution = data?.statusDistribution || [];
  const departmentDistribution = data?.departmentDistribution || [];
  const recentProcesses = data?.recentProcesses || [];
  const roleTitle = ROLE_LABELS[user?.role] || user?.role || "Usuário";

  return (
    <div className="space-y-lg">
      {/* Page Title & Action Header */}
      <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline-lg font-bold text-on-surface">
              Painel de Controle
            </h1>
            <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant">
              {roleTitle}
            </span>
          </div>
          <p className="mt-1 font-body-md text-on-surface-variant">
            Acompanhamento em tempo real dos processos de dispensa de licitação.
          </p>
        </div>

        <div className="flex items-center gap-xs">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Atualizar dados"
              aria-label="Atualizar dados do painel"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant bg-surface-container-lowest text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50"
            >
              <span
                aria-hidden="true"
                className={`material-symbols-outlined text-lg ${isLoading ? "animate-spin" : ""}`}
              >
                refresh
              </span>
            </button>
          )}

          <Link
            href="/processes/new"
            className="inline-flex items-center gap-xs rounded-md bg-primary px-md py-2 font-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-lg"
            >
              add_circle
            </span>
            <span>Nova Dispensa</span>
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-sm rounded-lg border border-error/30 bg-error-container/40 p-md text-on-error-container"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-xl text-error"
          >
            error
          </span>
          <div className="flex-1">
            <p className="font-label-md font-semibold">
              Erro ao carregar dados do painel
            </p>
            <p className="font-body-sm text-xs">{error}</p>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded bg-error px-sm py-1 font-label-sm text-on-error hover:bg-error/90"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {/* Attention / Pending Actions Banner (when domain model has actionable items) */}
      {summary.attentionCount > 0 && (
        <div
          role="region"
          aria-label="Atenção e pendências"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm rounded-lg border border-tertiary-container/40 bg-tertiary-fixed/30 p-md text-on-tertiary-fixed-variant"
        >
          <div className="flex items-center gap-sm">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-2xl text-tertiary"
            >
              notifications_active
            </span>
            <div>
              <p className="font-label-md font-semibold text-on-surface">
                {summary.attentionCount}{" "}
                {summary.attentionCount === 1
                  ? "item requer sua atenção"
                  : "itens requerem sua atenção"}
              </p>
              <p className="font-body-sm text-xs text-on-surface-variant">
                {summary.attentionDescription ||
                  "Processos com ações pendentes de análise ou aprovação."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Processes */}
        <DashboardStatCard
          title="Total de Processos"
          value={summary.totalProcesses}
          subtitle={`${summary.drafts} em rascunho`}
          icon="assignment"
          variant="default"
        />

        {/* In Progress */}
        <DashboardStatCard
          title="Em Andamento"
          value={summary.inProgress}
          subtitle="Análise, cotação e seleção"
          icon="pending_actions"
          variant="primary"
        />

        {/* Awaiting Approval */}
        <DashboardStatCard
          title="Aguardando Aprovação"
          value={summary.awaitingApproval}
          subtitle="Pendentes de parecer"
          icon="hourglass_top"
          variant={summary.awaitingApproval > 0 ? "tertiary" : "default"}
          badge={summary.awaitingApproval > 0 ? "Urgente" : undefined}
        />

        {/* Completed / Approved */}
        <DashboardStatCard
          title="Processos Concluídos"
          value={summary.completed}
          subtitle="Aprovados e homologados"
          icon="task_alt"
          variant="secondary"
        />
      </div>

      {/* Financial Metrics Strip */}
      <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
        <DashboardStatCard
          title="Valor Total Estimado"
          value={formatCurrency(summary.totalEstimatedValue)}
          subtitle="Soma dos valores estimados de todos os processos cadastrados"
          icon="payments"
          variant="default"
          helpText="Baseado no campo estimatedValue da demanda"
        />

        <DashboardStatCard
          title="Valor Homologado / Concluído"
          value={formatCurrency(summary.approvedEstimatedValue)}
          subtitle="Total de recursos vinculados a processos formalmente aprovados"
          icon="price_check"
          variant="primary"
          helpText="Aprovados + Concluídos"
        />
      </div>

      {/* Charts Section: Status & Department Distribution */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
        <ProcessStatusChart data={statusDistribution} />
        <DepartmentDistributionChart data={departmentDistribution} />
      </div>

      {/* Recent Processes Table */}
      <RecentProcessesTable processes={recentProcesses} />

      {/* Procurement Lifecycle Process Guide */}
      <ProcessLifecycleGuide />
    </div>
  );
}
