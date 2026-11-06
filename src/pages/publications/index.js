import Head from "next/head";
import Link from "next/link";
import { useCallback, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatProcessNumber,
  STATUS_LABELS,
  STATUS_BADGE_STYLES,
} from "@/components/dashboard/dashboardUtils";
import authentication from "@/infra/authentication";
import processService from "@/services/process.service";

export async function getServerSideProps(context) {
  try {
    const { user } = await authentication.getAuthenticatedUserFromRequest(
      context.req,
    );

    const initialResult = await processService.listProcesses(
      {
        status: "AWAITING_PUBLICATION",
        page: 1,
        pageSize: 20,
      },
      user,
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
        initialProcesses: initialResult.processes || [],
        initialMeta: initialResult.meta || {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
        },
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

export default function PublicationsIndexPage({
  user,
  initialProcesses = [],
  initialMeta = { page: 1, pageSize: 20, total: 0, totalPages: 0 },
}) {
  const [processes, setProcesses] = useState(initialProcesses);
  const [meta, setMeta] = useState(initialMeta);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState("AWAITING_PUBLICATION");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const isAgent = user?.role === "AGENTE_CONTRATACAO";

  const fetchProcesses = useCallback(
    async (override = {}) => {
      setLoading(true);
      setError(null);

      const targetStatus =
        override.status !== undefined ? override.status : statusFilter;
      const targetPage = override.page !== undefined ? override.page : page;
      const targetSearch =
        override.search !== undefined ? override.search : searchTerm;

      const queryParams = new URLSearchParams();
      queryParams.set("page", String(targetPage));
      queryParams.set("pageSize", "20");
      if (targetStatus) queryParams.set("status", targetStatus);
      if (targetSearch.trim()) queryParams.set("search", targetSearch.trim());

      try {
        const response = await fetch(
          `/api/v1/processes?${queryParams.toString()}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Erro ao consultar processos de publicação.",
          );
        }

        setProcesses(data.processes || []);
        setMeta(
          data.meta || { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        );
      } catch (err) {
        setError(err.message || "Falha na comunicação com o servidor.");
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, page, searchTerm],
  );

  const handleStatusTabChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
    fetchProcesses({ status: newStatus, page: 1 });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProcesses({ page: 1, search: searchTerm });
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchProcesses({ page: newPage });
  };

  return (
    <>
      <Head>
        <title>Módulo de Publicação e Finalização | SISD</title>
      </Head>

      <DashboardLayout user={user}>
        <div className="space-y-md">
          {/* Header Card */}
          <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg">
            <div className="flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
              <div>
                <span className="inline-flex items-center gap-1 rounded bg-secondary-container px-2 py-0.5 font-label-sm font-bold text-on-secondary-container">
                  Fase 5.3 & 6 — Publicidade e Conclusão
                </span>
                <h1 className="mt-1 flex items-center gap-xs font-headline-sm font-bold text-on-surface">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-primary"
                  >
                    public
                  </span>
                  Módulo de Publicação Oficial e Conclusão
                </h1>
                <p className="mt-1 font-body-sm text-on-surface-variant">
                  Acompanhamento de processos autorizados pela Autoridade
                  Competente para registro de publicidade e finalização
                  procedimental.
                </p>
              </div>

              <div className="flex items-center gap-sm">
                <span className="rounded-lg border border-outline-variant/60 bg-surface-container-high px-md py-2 font-label-md font-bold text-on-surface">
                  {meta.total} {meta.total === 1 ? "processo" : "processos"}
                </span>
              </div>
            </div>

            {/* Academic Simulation Notice */}
            <div className="mt-md rounded-lg border border-secondary/30 bg-secondary-container/20 p-sm text-xs text-on-secondary-container">
              <div className="flex items-start gap-xs">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-base text-secondary"
                >
                  school
                </span>
                <p>
                  <strong>Aviso Didático-Acadêmico:</strong> Este módulo
                  registra atos de publicação exclusivamente para documentação
                  interna no fluxo simulado do SISD. Não há integração real com
                  o Portal Nacional de Contratações Públicas (PNCP) ou Diários
                  Oficiais externos.
                </p>
              </div>
            </div>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md space-y-md">
            {/* Tabs */}
            <div className="flex flex-wrap border-b border-outline-variant/40 gap-xs">
              <button
                type="button"
                onClick={() => handleStatusTabChange("AWAITING_PUBLICATION")}
                className={`pb-2.5 px-3 font-label-md font-semibold transition-colors border-b-2 -mb-[1px] ${
                  statusFilter === "AWAITING_PUBLICATION"
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Aguardando Publicação (Prioridade)
              </button>

              <button
                type="button"
                onClick={() => handleStatusTabChange("COMPLETED")}
                className={`pb-2.5 px-3 font-label-md font-semibold transition-colors border-b-2 -mb-[1px] ${
                  statusFilter === "COMPLETED"
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Processos Concluídos (Publicados)
              </button>

              <button
                type="button"
                onClick={() => handleStatusTabChange("")}
                className={`pb-2.5 px-3 font-label-md font-semibold transition-colors border-b-2 -mb-[1px] ${
                  statusFilter === ""
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Todos os Status
              </button>
            </div>

            {/* Search form */}
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
                  placeholder="Filtrar por número, título ou objeto..."
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-9 pr-3 py-2 font-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-md py-2 font-label-md font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
              >
                Filtrar
              </button>

              <button
                type="button"
                onClick={() => fetchProcesses()}
                disabled={loading}
                title="Atualizar"
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
                onClick={() => fetchProcesses()}
                className="rounded bg-error px-sm py-1 font-label-sm text-on-error hover:bg-error/90"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* List of Processes */}
          {loading ? (
            <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest py-2xl text-center">
              <span
                aria-hidden="true"
                className="material-symbols-outlined animate-spin text-3xl text-primary"
              >
                progress_activity
              </span>
              <p className="mt-2 font-body-sm text-on-surface-variant">
                Carregando processos...
              </p>
            </div>
          ) : processes.length === 0 ? (
            <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest py-2xl text-center">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-4xl text-outline"
              >
                public
              </span>
              <h3 className="mt-2 font-title-md font-bold text-on-surface">
                Nenhum processo encontrado nesta categoria
              </h3>
              <p className="mt-1 font-body-sm text-on-surface-variant max-w-md mx-auto">
                {statusFilter === "AWAITING_PUBLICATION"
                  ? "Não há contratações diretas aguardando publicação no momento. Processos autorizados pela Autoridade Competente aparecerão aqui para registro comprobatório."
                  : "Nenhum registro corresponde aos filtros selecionados."}
              </p>
            </div>
          ) : (
            <div className="space-y-sm">
              {processes.map((proc) => {
                const isAwaitingPub = proc.status === "AWAITING_PUBLICATION";
                const isProcCompleted = proc.status === "COMPLETED";
                const badgeStyle =
                  STATUS_BADGE_STYLES[proc.status] ||
                  "bg-surface-container text-on-surface";
                const label = STATUS_LABELS[proc.status] || proc.status;

                return (
                  <div
                    key={proc.id}
                    className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md transition-shadow hover:shadow-sm sm:p-lg"
                  >
                    <div className="flex flex-col justify-between gap-sm sm:flex-row sm:items-start">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-xs">
                          <span className="font-headline-sm font-bold text-primary">
                            {formatProcessNumber(proc.number, proc.year)}
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${badgeStyle}`}
                          >
                            {label}
                          </span>

                          {isProcCompleted && (
                            <span className="rounded bg-primary-fixed px-2 py-0.5 text-xs font-semibold text-on-primary-fixed-variant">
                              Publicado
                            </span>
                          )}
                        </div>

                        <h3 className="font-title-md font-semibold text-on-surface">
                          {proc.title}
                        </h3>

                        <p className="font-body-sm text-on-surface-variant line-clamp-2">
                          {proc.object}
                        </p>
                      </div>

                      <div className="shrink-0 text-left sm:text-right">
                        <span className="block text-xs text-outline">
                          Valor Homologado
                        </span>
                        <span className="font-title-md font-bold text-primary">
                          {formatCurrency(proc.estimatedValue)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-md grid grid-cols-1 gap-xs border-t border-outline-variant/40 pt-md text-xs text-on-surface-variant sm:grid-cols-3">
                      <div>
                        <span className="text-outline">Departamento:</span>{" "}
                        <strong>{proc.department?.name || "—"}</strong>
                      </div>

                      <div>
                        <span className="text-outline">Solicitante:</span>{" "}
                        <strong>{proc.requester?.name || "—"}</strong>
                      </div>

                      <div>
                        <span className="text-outline">
                          Última Atualização:
                        </span>{" "}
                        <strong>{formatDateTime(proc.updatedAt)}</strong>
                      </div>
                    </div>

                    <div className="mt-md flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
                      <div className="text-xs text-outline">
                        {isAwaitingPub
                          ? "Autorização final deferida — aguardando registro de publicação."
                          : isProcCompleted
                            ? "Processo finalizado com publicidade oficial registrada."
                            : "Processo em tramitação."}
                      </div>

                      <Link
                        href={`/processes/${proc.id}?tab=publications`}
                        className={`inline-flex items-center justify-center gap-xs rounded-lg px-lg py-2 font-label-md font-semibold shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          isAwaitingPub && isAgent
                            ? "bg-primary text-on-primary hover:bg-primary/90 focus-visible:outline-primary"
                            : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined text-lg"
                        >
                          {isAwaitingPub && isAgent ? "publish" : "description"}
                        </span>
                        {isAwaitingPub && isAgent
                          ? "Registrar Publicação"
                          : "Ver Publicações e Documentos"}
                      </Link>
                    </div>
                  </div>
                );
              })}
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
