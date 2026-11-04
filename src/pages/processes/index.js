import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import ProcessStatusBadge from "@/components/dashboard/ProcessStatusBadge";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  URGENCY_BADGE_STYLES,
  URGENCY_LABELS,
  formatCurrency,
  formatDate,
  formatProcessNumber,
} from "@/components/dashboard/dashboardUtils";

export async function getServerSideProps(context) {
  const { req, query } = context;
  const cookieHeader = req.headers.cookie ?? "";

  try {
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const host = req.headers.host;

    const userResponse = await fetch(`${protocol}://${host}/api/v1/user`, {
      headers: {
        cookie: cookieHeader,
      },
    });

    if (!userResponse.ok) {
      return {
        redirect: {
          destination: "/login",
          permanent: false,
        },
      };
    }

    const user = await userResponse.json();

    const params = new URLSearchParams();
    for (const key of [
      "status",
      "departmentId",
      "year",
      "createdFrom",
      "createdTo",
      "search",
      "page",
      "pageSize",
    ]) {
      if (query[key] && typeof query[key] === "string" && query[key].trim()) {
        params.set(key, query[key].trim());
      }
    }

    let initialList = {
      processes: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      departments: [],
    };

    try {
      const qs = params.toString();
      const processesResponse = await fetch(
        `${protocol}://${host}/api/v1/processes${qs ? `?${qs}` : ""}`,
        {
          headers: {
            cookie: cookieHeader,
          },
        },
      );

      if (processesResponse.ok) {
        initialList = await processesResponse.json();
      }
    } catch {
      // Allow client-side fallback
    }

    return {
      props: {
        user,
        initialList,
        initialFilters: {
          search: typeof query.search === "string" ? query.search : "",
          status: typeof query.status === "string" ? query.status : "",
          departmentId:
            typeof query.departmentId === "string" ? query.departmentId : "",
          year: typeof query.year === "string" ? query.year : "",
          createdFrom:
            typeof query.createdFrom === "string" ? query.createdFrom : "",
          createdTo: typeof query.createdTo === "string" ? query.createdTo : "",
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

const inputClasses =
  "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-2 font-body-sm text-on-surface placeholder:text-outline transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export default function ProcessListPage({ user, initialList, initialFilters }) {
  const router = useRouter();
  const [listData, setListData] = useState(initialList);
  const [filters, setFilters] = useState(
    initialFilters || {
      search: "",
      status: "",
      departmentId: "",
      year: "",
      createdFrom: "",
      createdTo: "",
    },
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const processes = listData?.processes || [];
  const meta = listData?.meta || {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  };
  const departments = listData?.departments || [];
  const canCreate = user?.role !== "APROVADOR";

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const fetchProcesses = useCallback(
    async (activeFilters, targetPage = 1) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (activeFilters.search?.trim()) {
          params.set("search", activeFilters.search.trim());
        }
        if (activeFilters.status?.trim()) {
          params.set("status", activeFilters.status.trim());
        }
        if (activeFilters.departmentId?.trim()) {
          params.set("departmentId", activeFilters.departmentId.trim());
        }
        if (activeFilters.year?.trim()) {
          params.set("year", activeFilters.year.trim());
        }
        if (activeFilters.createdFrom?.trim()) {
          params.set("createdFrom", activeFilters.createdFrom.trim());
        }
        if (activeFilters.createdTo?.trim()) {
          params.set("createdTo", activeFilters.createdTo.trim());
        }
        if (targetPage > 1) {
          params.set("page", String(targetPage));
        }

        const qs = params.toString();
        const url = `/api/v1/processes${qs ? `?${qs}` : ""}`;

        const response = await fetch(url);
        const body = await response.json();

        if (!response.ok) {
          throw new Error(
            body.message || "Não foi possível carregar os processos.",
          );
        }

        setListData(body);
        router.replace(`/processes${qs ? `?${qs}` : ""}`, undefined, {
          shallow: true,
        });
      } catch (err) {
        setError(err.message || "Erro ao buscar processos.");
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchProcesses(filters, 1);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      search: "",
      status: "",
      departmentId: "",
      year: "",
      createdFrom: "",
      createdTo: "",
    };
    setFilters(emptyFilters);
    fetchProcesses(emptyFilters, 1);
  };

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.status ||
    filters.departmentId ||
    filters.year ||
    filters.createdFrom ||
    filters.createdTo,
  );

  return (
    <>
      <Head>
        <title>Processos de Dispensa — SISD</title>
        <meta
          name="description"
          content="Listagem e consulta de processos de dispensa de licitação no SISD."
        />
      </Head>

      <DashboardLayout user={user}>
        <div className="space-y-lg">
          {/* Header */}
          <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-headline-lg font-bold text-on-surface">
                Processos de Dispensa
              </h1>
              <p className="mt-1 font-body-md text-on-surface-variant">
                Consulte, filtre e acompanhe os processos administrativos de
                dispensa de licitação.
              </p>
            </div>

            {canCreate && (
              <Link
                href="/processes/new"
                className="inline-flex items-center gap-xs self-start rounded-md bg-primary px-md py-2.5 font-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-lg"
                >
                  add_circle
                </span>
                <span>Nova Dispensa</span>
              </Link>
            )}
          </div>

          {/* Search and Filter Form */}
          <form
            method="GET"
            action="/processes"
            onSubmit={handleFilterSubmit}
            aria-label="Filtros de busca de processos"
            className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-md"
          >
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-6">
              <div className="sm:col-span-2">
                <label
                  htmlFor="filter-search"
                  className="mb-1 block font-label-sm text-on-surface"
                >
                  Buscar por número, título ou objeto
                </label>
                <input
                  id="filter-search"
                  name="search"
                  type="search"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                  placeholder="Ex: DP-001/2026 ou computadores"
                  className={inputClasses}
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="filter-status"
                  className="mb-1 block font-label-sm text-on-surface"
                >
                  Status
                </label>
                <select
                  id="filter-status"
                  name="status"
                  className={inputClasses}
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                >
                  <option value="">Todos os status</option>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="filter-department"
                  className="mb-1 block font-label-sm text-on-surface"
                >
                  Departamento
                </label>
                <select
                  id="filter-department"
                  name="departmentId"
                  className={inputClasses}
                  value={filters.departmentId}
                  onChange={(e) =>
                    handleFilterChange("departmentId", e.target.value)
                  }
                >
                  <option value="">Todos os departamentos</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="filter-year"
                  className="mb-1 block font-label-sm text-on-surface"
                >
                  Ano
                </label>
                <select
                  id="filter-year"
                  name="year"
                  className={inputClasses}
                  value={filters.year}
                  onChange={(e) => handleFilterChange("year", e.target.value)}
                >
                  <option value="">Todos</option>
                  {yearOptions.map((yr) => (
                    <option key={yr} value={String(yr)}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-xs">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-sm py-2 font-label-md text-on-primary transition-colors hover:bg-primary-container disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-base"
                  >
                    search
                  </span>
                  <span>Filtrar</span>
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    disabled={isLoading}
                    aria-label="Limpar todos os filtros"
                    className="flex items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-2 font-label-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Period filter row */}
            <div className="mt-sm grid grid-cols-1 gap-sm border-t border-outline-variant/40 pt-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="filter-createdFrom"
                  className="mb-1 block font-label-sm text-on-surface-variant"
                >
                  Criado a partir de
                </label>
                <input
                  id="filter-createdFrom"
                  name="createdFrom"
                  type="date"
                  className={inputClasses}
                  value={filters.createdFrom}
                  onChange={(e) =>
                    handleFilterChange("createdFrom", e.target.value)
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="filter-createdTo"
                  className="mb-1 block font-label-sm text-on-surface-variant"
                >
                  Criado até
                </label>
                <input
                  id="filter-createdTo"
                  name="createdTo"
                  type="date"
                  className={inputClasses}
                  value={filters.createdTo}
                  onChange={(e) =>
                    handleFilterChange("createdTo", e.target.value)
                  }
                />
              </div>

              <div
                aria-live="polite"
                className="flex items-end font-body-sm text-xs text-on-surface-variant sm:col-span-2"
              >
                <span>
                  Exibindo <strong>{processes.length}</strong> de{" "}
                  <strong>{meta.total}</strong>{" "}
                  {meta.total === 1
                    ? "processo encontrado"
                    : "processos encontrados"}
                </span>
              </div>
            </div>
          </form>

          {/* Error state */}
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
                  Erro ao carregar processos
                </p>
                <p className="font-body-sm text-xs">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => fetchProcesses(filters, meta.page)}
                className="rounded bg-error px-sm py-1 font-label-sm text-on-error hover:bg-error/90"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Table or Empty State */}
          {processes.length === 0 ? (
            <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-md">
              <DashboardEmptyState
                icon="folder_open"
                title={
                  hasActiveFilters
                    ? "Nenhum processo corresponde aos filtros aplicados"
                    : "Nenhum processo cadastrado"
                }
                description={
                  hasActiveFilters
                    ? "Ajuste ou limpe os filtros de busca para visualizar outros processos."
                    : "Inicie um novo processo de dispensa preenchendo o Documento de Formalização da Demanda (DFD)."
                }
                actionLabel={canCreate ? "Nova Dispensa" : undefined}
                actionHref={canCreate ? "/processes/new" : undefined}
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-outline-variant/70 bg-surface-container-lowest">
              <div
                tabIndex={0}
                role="region"
                aria-labelledby="processes-table-caption"
                className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
              >
                <table className="w-full text-left font-body-sm">
                  <caption id="processes-table-caption" className="sr-only">
                    Lista de processos de dispensa de licitação
                  </caption>
                  <thead>
                    <tr className="border-b border-outline-variant/70 bg-surface-container-low text-on-surface-variant">
                      <th
                        scope="col"
                        className="px-md py-3 font-semibold text-xs uppercase tracking-wider"
                      >
                        Processo
                      </th>
                      <th
                        scope="col"
                        className="px-md py-3 font-semibold text-xs uppercase tracking-wider"
                      >
                        Título / Objeto
                      </th>
                      <th
                        scope="col"
                        className="hidden px-md py-3 font-semibold text-xs uppercase tracking-wider md:table-cell"
                      >
                        Departamento
                      </th>
                      <th
                        scope="col"
                        className="hidden px-md py-3 font-semibold text-xs uppercase tracking-wider lg:table-cell"
                      >
                        Solicitante
                      </th>
                      <th
                        scope="col"
                        className="px-md py-3 font-semibold text-xs uppercase tracking-wider"
                      >
                        Valor Estimado
                      </th>
                      <th
                        scope="col"
                        className="hidden px-md py-3 font-semibold text-xs uppercase tracking-wider sm:table-cell"
                      >
                        Data
                      </th>
                      <th
                        scope="col"
                        className="px-md py-3 font-semibold text-xs uppercase tracking-wider text-right"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-md py-3 font-semibold text-xs uppercase tracking-wider text-right"
                      >
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 text-on-surface">
                    {processes.map((proc) => {
                      const formattedNumber = formatProcessNumber(
                        proc.number,
                        proc.year,
                      );
                      const dfdCategory = proc.demandDocument?.category
                        ? CATEGORY_LABELS[proc.demandDocument.category] ||
                          proc.demandDocument.category
                        : null;
                      const dfdUrgency = proc.demandDocument?.urgency;

                      return (
                        <tr
                          key={proc.id}
                          className="transition-colors hover:bg-surface-container-low/60"
                        >
                          <th
                            scope="row"
                            className="whitespace-nowrap px-md py-3 font-semibold text-primary"
                          >
                            <Link
                              href={`/processes/${proc.id}`}
                              className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                              {formattedNumber}
                            </Link>
                          </th>

                          <td className="px-md py-3 max-w-xs md:max-w-md">
                            <Link
                              href={`/processes/${proc.id}`}
                              className="block truncate font-semibold text-on-surface hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              title={proc.title}
                            >
                              {proc.title}
                            </Link>
                            <p
                              className="mt-0.5 truncate text-xs text-on-surface-variant"
                              title={proc.object}
                            >
                              {proc.object}
                            </p>
                            {dfdCategory && (
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                <span className="inline-flex items-center rounded bg-surface-container px-1.5 py-0.5 text-[11px] font-medium text-on-surface-variant">
                                  {dfdCategory}
                                </span>
                                {dfdUrgency && (
                                  <span
                                    className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${
                                      URGENCY_BADGE_STYLES[dfdUrgency] ||
                                      URGENCY_BADGE_STYLES.MEDIUM
                                    }`}
                                  >
                                    Urgência:{" "}
                                    {URGENCY_LABELS[dfdUrgency] || dfdUrgency}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="hidden px-md py-3 text-on-surface-variant md:table-cell whitespace-nowrap">
                            {proc.department}
                          </td>

                          <td className="hidden px-md py-3 text-on-surface-variant lg:table-cell whitespace-nowrap">
                            {proc.requester?.name || "—"}
                          </td>

                          <td className="whitespace-nowrap px-md py-3 font-medium text-on-surface">
                            {formatCurrency(proc.estimatedValue)}
                          </td>

                          <td className="hidden px-md py-3 text-on-surface-variant sm:table-cell whitespace-nowrap">
                            {formatDate(proc.createdAt)}
                          </td>

                          <td className="whitespace-nowrap px-md py-3 text-right">
                            <ProcessStatusBadge status={proc.status} />
                          </td>

                          <td className="whitespace-nowrap px-md py-3 text-right">
                            <Link
                              href={`/processes/${proc.id}`}
                              aria-label={`Abrir processo ${formattedNumber} - ${proc.title}`}
                              className="inline-flex items-center gap-1 rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 font-label-sm text-primary transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                              <span>Abrir</span>
                              <span
                                aria-hidden="true"
                                className="material-symbols-outlined text-base"
                              >
                                open_in_new
                              </span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-outline-variant/60 bg-surface-container-low px-md py-sm">
                  <span className="font-body-sm text-xs text-on-surface-variant">
                    Página <strong>{meta.page}</strong> de{" "}
                    <strong>{meta.totalPages}</strong>
                  </span>

                  <div className="flex items-center gap-xs">
                    <button
                      type="button"
                      disabled={meta.page <= 1 || isLoading}
                      onClick={() => fetchProcesses(filters, meta.page - 1)}
                      className="inline-flex items-center gap-1 rounded-md border border-outline-variant bg-surface-container-lowest px-sm py-1.5 font-label-sm text-on-surface transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-base"
                      >
                        chevron_left
                      </span>
                      Anterior
                    </button>

                    <button
                      type="button"
                      disabled={meta.page >= meta.totalPages || isLoading}
                      onClick={() => fetchProcesses(filters, meta.page + 1)}
                      className="inline-flex items-center gap-1 rounded-md border border-outline-variant bg-surface-container-lowest px-sm py-1.5 font-label-sm text-on-surface transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Próxima
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-base"
                      >
                        chevron_right
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
