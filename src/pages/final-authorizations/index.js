import Head from "next/head";
import Link from "next/link";
import { useCallback, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  formatCurrency,
  formatDateTime,
  formatProcessNumber,
} from "@/components/dashboard/dashboardUtils";
import authentication from "@/infra/authentication";
import finalAuthorizationService from "@/services/final-authorization.service";

export async function getServerSideProps(context) {
  try {
    const { user } = await authentication.getAuthenticatedUserFromRequest(
      context.req,
    );

    if (user.role !== "AUTORIDADE_COMPETENTE") {
      return {
        redirect: {
          destination: "/dashboard",
          permanent: false,
        },
      };
    }

    const initialResult =
      await finalAuthorizationService.listPendingFinalAuthorizations(
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

export default function FinalAuthorizationInboxPage({
  user,
  initialTasks = [],
  initialMeta = { page: 1, pageSize: 20, total: 0, totalPages: 0 },
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [meta, setMeta] = useState(initialMeta);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const fetchTasks = useCallback(
    async (override = {}) => {
      setLoading(true);
      setError(null);

      const targetPage = override.page !== undefined ? override.page : page;
      const targetSearch =
        override.search !== undefined ? override.search : searchTerm;

      const queryParams = new URLSearchParams();
      queryParams.set("page", String(targetPage));
      queryParams.set("pageSize", "20");
      if (targetSearch.trim()) queryParams.set("search", targetSearch.trim());

      try {
        const response = await fetch(
          `/api/v1/final-authorizations?${queryParams.toString()}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Erro ao carregar processos para autorização.",
          );
        }

        setTasks(data.tasks || []);
        setMeta(
          data.meta || { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        );
      } catch (err) {
        setError(
          err.message || "Falha ao consultar tarefas de autorização final.",
        );
      } finally {
        setLoading(false);
      }
    },
    [page, searchTerm],
  );

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTasks({ page: 1, search: searchTerm });
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchTasks({ page: newPage });
  };

  return (
    <>
      <Head>
        <title>Caixa de Deliberação da Autoridade Competente | SISD</title>
      </Head>

      <DashboardLayout user={user} attentionCount={meta.total}>
        <div className="space-y-md">
          {/* Header Card */}
          <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg">
            <div className="flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
              <div>
                <span className="inline-flex items-center gap-1 rounded bg-tertiary-fixed px-2 py-0.5 font-label-sm font-bold text-on-tertiary-fixed-variant">
                  Fase 5 — Autorização Soberana
                </span>
                <h1 className="mt-1 flex items-center gap-xs font-headline-sm font-bold text-on-surface">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-primary"
                  >
                    verified
                  </span>
                  Caixa de Deliberação da Autoridade Competente
                </h1>
                <p className="mt-1 font-body-sm text-on-surface-variant">
                  Processos de dispensa de licitação do seu departamento que
                  concluíram a aprovação interna e aguardam sua deliberação
                  final.
                </p>
              </div>

              <div className="flex items-center gap-sm">
                <span className="rounded-lg border border-outline-variant/60 bg-surface-container-high px-md py-2 font-label-md font-bold text-on-surface">
                  {meta.total} {meta.total === 1 ? "processo" : "processos"}
                </span>
              </div>
            </div>

            {/* Department info */}
            {user?.departmentName && (
              <div className="mt-sm flex items-center gap-xs text-xs text-outline">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-sm"
                >
                  domain
                </span>
                <span>
                  Lotação Departamental:{" "}
                  <strong className="text-on-surface">
                    {user.departmentName}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md">
            <form onSubmit={handleSearchSubmit} className="flex gap-sm">
              <div className="relative flex-1">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg"
                >
                  search
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por número do processo, título ou objeto..."
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-9 pr-3 py-2 font-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-md py-2 font-label-md font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
              >
                Buscar
              </button>

              <button
                type="button"
                onClick={() => fetchTasks()}
                disabled={loading}
                title="Recarregar"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
              >
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-lg ${loading ? "animate-spin" : ""}`}
                >
                  refresh
                </span>
              </button>
            </form>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="flex items-center justify-between rounded-lg border border-error/30 bg-error-container/40 p-md text-on-error-container"
            >
              <div className="flex items-center gap-sm">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-xl text-error"
                >
                  error
                </span>
                <p className="font-body-sm">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => fetchTasks()}
                className="rounded bg-error px-sm py-1 font-label-sm text-on-error hover:bg-error/90"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Task List */}
          {loading ? (
            <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest py-2xl text-center">
              <span
                aria-hidden="true"
                className="material-symbols-outlined animate-spin text-3xl text-primary"
              >
                progress_activity
              </span>
              <p className="mt-2 font-body-sm text-on-surface-variant">
                Carregando processos pendentes de deliberação...
              </p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest py-2xl text-center">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-4xl text-outline"
              >
                verified
              </span>
              <h3 className="mt-2 font-title-md font-bold text-on-surface">
                Nenhum processo pendente de autorização final
              </h3>
              <p className="mt-1 font-body-sm text-on-surface-variant max-w-md mx-auto">
                No momento, não há contratações diretas aguardando sua
                deliberação. Novos processos aprovados na Fase 4 aparecerão aqui
                automaticamente após encaminhamento pelo Agente de Contratação.
              </p>
              <div className="mt-md">
                <Link
                  href="/processes"
                  className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-md py-2 font-label-md text-on-surface hover:bg-surface-container"
                >
                  Ver todos os processos
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-sm">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md transition-shadow hover:shadow-sm sm:p-lg"
                >
                  <div className="flex flex-col justify-between gap-sm sm:flex-row sm:items-start">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-xs">
                        <span className="font-headline-sm font-bold text-primary">
                          {task.formattedNumber ||
                            formatProcessNumber(task.number, task.year)}
                        </span>

                        <span className="rounded-full bg-tertiary-fixed px-2.5 py-0.5 text-xs font-bold text-on-tertiary-fixed-variant">
                          Aguardando Autorização Final
                        </span>

                        <span className="rounded bg-surface-container px-2 py-0.5 text-xs font-semibold text-on-surface-variant">
                          Ciclo {task.currentCycle || 1}
                        </span>

                        {!task.canDecide && (
                          <span className="rounded bg-error-container px-2 py-0.5 text-xs font-semibold text-on-error-container">
                            Impedido (Segregação de Funções)
                          </span>
                        )}
                      </div>

                      <h3 className="font-title-md font-semibold text-on-surface">
                        {task.title}
                      </h3>

                      <p className="font-body-sm text-on-surface-variant line-clamp-2">
                        {task.object}
                      </p>
                    </div>

                    <div className="shrink-0 text-left sm:text-right">
                      <span className="block text-xs text-outline">
                        Valor Estimado / Homologado
                      </span>
                      <span className="font-title-md font-bold text-primary">
                        {formatCurrency(task.estimatedValue)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-md grid grid-cols-1 gap-xs border-t border-outline-variant/40 pt-md text-xs text-on-surface-variant sm:grid-cols-3">
                    <div>
                      <span className="text-outline">Solicitante:</span>{" "}
                      <strong>{task.requester?.name || "—"}</strong>
                    </div>

                    <div>
                      <span className="text-outline">
                        Fornecedor Selecionado:
                      </span>{" "}
                      <strong>
                        {task.selectedSupplier?.tradeName ||
                          task.selectedSupplier?.legalName ||
                          "—"}
                      </strong>
                    </div>

                    <div>
                      <span className="text-outline">
                        Aprovação Interna em:
                      </span>{" "}
                      <strong>
                        {task.internalApproval?.decidedAt
                          ? formatDateTime(task.internalApproval.decidedAt)
                          : "—"}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-md flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
                    <div className="text-xs text-outline">
                      Encaminhado em:{" "}
                      {formatDateTime(task.updatedAt || task.createdAt)}
                    </div>

                    <Link
                      href={`/processes/${task.id}?tab=final-authorization`}
                      className="inline-flex items-center justify-center gap-xs rounded-lg bg-primary px-lg py-2 font-label-md font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-lg"
                      >
                        gavel
                      </span>
                      Analisar e Deliberar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-outline-variant/40 pt-md">
              <span className="text-xs text-outline">
                Página {meta.page} de {meta.totalPages} ({meta.total} itens)
              </span>

              <div className="flex gap-xs">
                <button
                  type="button"
                  onClick={() => handlePageChange(meta.page - 1)}
                  disabled={meta.page <= 1 || loading}
                  className="rounded-lg border border-outline-variant px-md py-1.5 font-label-sm text-on-surface hover:bg-surface-container disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(meta.page + 1)}
                  disabled={meta.page >= meta.totalPages || loading}
                  className="rounded-lg border border-outline-variant px-md py-1.5 font-label-sm text-on-surface hover:bg-surface-container disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
