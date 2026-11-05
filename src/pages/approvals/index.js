import Head from "next/head";
import Link from "next/link";
import { useCallback, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  formatDateTime,
  ROLE_LABELS,
} from "@/components/dashboard/dashboardUtils";
import authentication from "@/infra/authentication";
import workflowService from "@/services/workflow.service";

export async function getServerSideProps(context) {
  try {
    const { user } = await authentication.getAuthenticatedUserFromRequest(
      context.req,
    );

    if (
      user.role !== "AGENTE_CONTRATACAO" &&
      user.role !== "APROVADOR" &&
      user.role !== "ADMIN"
    ) {
      return {
        redirect: {
          destination: "/dashboard",
          permanent: false,
        },
      };
    }

    const initialResult = await workflowService.listApprovalInbox(
      user,
      context.query || {},
    );

    return {
      props: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId || null,
          departmentName: user.department?.name || null,
        },
        initialTasks: initialResult.tasks,
        initialMeta: initialResult.meta,
      },
    };
  } catch {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }
}

export default function ApprovalsInboxPage({
  user,
  initialTasks = [],
  initialMeta = { page: 1, pageSize: 20, total: 0, totalPages: 0 },
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [meta, setMeta] = useState(initialMeta);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [stageFilter, setStageFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const fetchInboxTasks = useCallback(
    async (override = {}) => {
      setLoading(true);
      setError(null);

      const targetStatus =
        override.status !== undefined ? override.status : statusFilter;
      const targetStage =
        override.stage !== undefined ? override.stage : stageFilter;
      const targetPage = override.page !== undefined ? override.page : page;
      const targetSearch =
        override.search !== undefined ? override.search : searchTerm;

      const queryParams = new URLSearchParams();
      queryParams.set("page", String(targetPage));
      queryParams.set("pageSize", "20");
      if (targetStatus) queryParams.set("status", targetStatus);
      if (targetStage) queryParams.set("stage", targetStage);
      if (targetSearch.trim()) queryParams.set("search", targetSearch.trim());

      try {
        const response = await fetch(
          `/api/v1/approvals?${queryParams.toString()}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Erro ao carregar tarefas da caixa de aprovação.",
          );
        }

        setTasks(data.tasks || []);
        setMeta(
          data.meta || { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        );
      } catch (err) {
        setError(err.message || "Falha ao consultar a caixa de aprovação.");
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, stageFilter, page, searchTerm],
  );

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInboxTasks({ page: 1, search: searchTerm });
  };

  return (
    <>
      <Head>
        <title>Caixa de Aprovações | SISD</title>
      </Head>

      <DashboardLayout user={user}>
        <div className="space-y-md">
          {/* Header */}
          <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg">
            <div className="flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
              <div>
                <h1 className="flex items-center gap-xs font-headline-sm font-bold text-on-surface">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-primary"
                  >
                    fact_check
                  </span>
                  Caixa de Aprovação & Análise Interna
                </h1>
                <p className="mt-1 font-body-sm text-on-surface-variant">
                  Processos administrativos atribuídos à sua alçada para análise
                  técnica ou decisão homologatória.
                </p>
              </div>

              <div className="flex items-center gap-xs text-xs text-on-surface-variant">
                <span className="rounded-md border border-outline-variant/60 bg-surface-container-high px-2.5 py-1 font-label-sm font-bold text-on-surface">
                  {ROLE_LABELS[user.role] || user.role}
                </span>
                {user.departmentName && (
                  <span className="rounded-md border border-outline-variant/60 bg-surface-container px-2 py-1 font-label-sm">
                    {user.departmentName}
                  </span>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="mt-md flex flex-col gap-sm border-t border-outline-variant/40 pt-md sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-xs">
                <span className="font-label-sm font-bold text-on-surface-variant">
                  Status:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("PENDING");
                    setPage(1);
                    fetchInboxTasks({ status: "PENDING", page: 1 });
                  }}
                  className={`rounded-lg px-sm py-1.5 font-label-sm font-medium transition-colors ${
                    statusFilter === "PENDING"
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  Pendentes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("COMPLETED");
                    setPage(1);
                    fetchInboxTasks({ status: "COMPLETED", page: 1 });
                  }}
                  className={`rounded-lg px-sm py-1.5 font-label-sm font-medium transition-colors ${
                    statusFilter === "COMPLETED"
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  Concluídas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("ALL");
                    setPage(1);
                    fetchInboxTasks({ status: "ALL", page: 1 });
                  }}
                  className={`rounded-lg px-sm py-1.5 font-label-sm font-medium transition-colors ${
                    statusFilter === "ALL"
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  Todas
                </button>

                {user.role === "ADMIN" && (
                  <select
                    value={stageFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStageFilter(val);
                      setPage(1);
                      fetchInboxTasks({ stage: val, page: 1 });
                    }}
                    className="ml-sm rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-1.5 font-label-sm text-on-surface focus:border-primary focus:outline-none"
                  >
                    <option value="">Todas as Etapas</option>
                    <option value="ANALYSIS">Etapa 1: Análise Técnica</option>
                    <option value="APPROVAL">Etapa 2: Aprovação Interna</option>
                  </select>
                )}
              </div>

              {/* Search form */}
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center gap-xs"
              >
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nº ou objeto..."
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-1.5 font-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none sm:w-64"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-surface-container-high p-2 text-on-surface hover:bg-surface-container-highest"
                  title="Pesquisar"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-base"
                  >
                    search
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* Inbox Tasks Table */}
          <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg">
            {error && (
              <div className="mb-md rounded-md bg-error-container p-sm font-body-sm text-on-error-container">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined animate-spin text-3xl text-primary"
                >
                  progress_activity
                </span>
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-xl text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-outline">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-2xl"
                  >
                    inbox
                  </span>
                </div>
                <h3 className="mt-sm font-title-md font-bold text-on-surface">
                  Nenhuma tarefa encontrada
                </h3>
                <p className="mt-xs text-xs text-on-surface-variant">
                  {statusFilter === "PENDING"
                    ? "Não há processos pendentes de análise ou aprovação para seu perfil no momento."
                    : "Nenhum registro corresponde aos filtros selecionados."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-body-sm">
                  <thead className="border-b border-outline-variant/60 font-label-sm font-bold text-on-surface-variant">
                    <tr>
                      <th className="pb-sm">Processo</th>
                      <th className="pb-sm">Objeto</th>
                      <th className="pb-sm">Departamento</th>
                      <th className="pb-sm">Etapa</th>
                      <th className="pb-sm">Ciclo</th>
                      <th className="pb-sm">Atribuído em</th>
                      <th className="pb-sm text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {tasks.map((task) => (
                      <tr
                        key={task.id}
                        className="hover:bg-surface-container-low/40"
                      >
                        <td className="py-sm font-bold text-primary">
                          <Link
                            href={`/processes/${task.process.id}?tab=approvals`}
                            className="hover:underline"
                          >
                            {task.process.formattedNumber}
                          </Link>
                        </td>
                        <td className="py-sm">
                          <div
                            className="max-w-xs truncate text-on-surface"
                            title={task.process.object}
                          >
                            {task.process.object}
                          </div>
                          <div className="text-xs text-on-surface-variant">
                            Solicitante: {task.process.requester?.name || "—"}
                          </div>
                        </td>
                        <td className="py-sm text-on-surface">
                          {task.process.department?.name || "—"}
                        </td>
                        <td className="py-sm">
                          <span className="inline-flex rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                            {task.stageLabel}
                          </span>
                        </td>
                        <td className="py-sm text-center text-xs font-bold text-on-surface">
                          #{task.cycle}
                        </td>
                        <td className="py-sm text-xs text-on-surface-variant">
                          <div>{formatDateTime(task.createdAt)}</div>
                          {task.timePendingHours > 0 && !task.decision && (
                            <div className="text-outline">
                              Há {task.timePendingHours} hora(s)
                            </div>
                          )}
                        </td>
                        <td className="py-sm text-right">
                          <Link
                            href={`/processes/${task.process.id}?tab=approvals`}
                            className="inline-flex items-center gap-1 rounded-lg bg-surface-container-high px-sm py-1.5 font-label-sm font-medium text-on-surface hover:bg-primary hover:text-on-primary transition-colors"
                          >
                            <span>Analisar</span>
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined text-sm"
                            >
                              arrow_forward
                            </span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {meta.totalPages > 1 && (
              <div className="mt-md flex items-center justify-between border-t border-outline-variant/40 pt-sm text-xs text-on-surface-variant">
                <span>
                  Mostrando página {meta.page} de {meta.totalPages} (
                  {meta.total} tarefas)
                </span>
                <div className="flex items-center gap-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const prevPage = Math.max(1, meta.page - 1);
                      setPage(prevPage);
                      fetchInboxTasks({ page: prevPage });
                    }}
                    disabled={meta.page <= 1}
                    className="rounded border border-outline-variant p-1.5 hover:bg-surface-container disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextPage = Math.min(meta.totalPages, meta.page + 1);
                      setPage(nextPage);
                      fetchInboxTasks({ page: nextPage });
                    }}
                    disabled={meta.page >= meta.totalPages}
                    className="rounded border border-outline-variant p-1.5 hover:bg-surface-container disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
