import Link from "next/link";
import ProcessStatusBadge from "./ProcessStatusBadge";
import DashboardEmptyState from "./DashboardEmptyState";
import {
  formatCurrency,
  formatDate,
  formatProcessNumber,
} from "./dashboardUtils";

export default function RecentProcessesTable({ processes = [] }) {
  if (!processes || processes.length === 0) {
    return (
      <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-md">
        <div className="border-b border-outline-variant/50 pb-sm mb-md flex items-center justify-between">
          <h2 className="font-headline-sm font-semibold text-on-surface">
            Processos Recentes
          </h2>
        </div>
        <DashboardEmptyState
          icon="folder_open"
          title="Nenhum processo recente"
          description="Ainda não há registros de processos de dispensa. Inicie formalizando um novo Documento de Formalização da Demanda (DFD)."
          actionLabel="Nova Dispensa"
          actionHref="/processes/new"
          compact
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant/70 bg-surface-container-lowest">
      <div className="flex flex-wrap items-center justify-between border-b border-outline-variant/70 px-md py-sm gap-2">
        <div>
          <h2 className="font-headline-sm font-semibold text-on-surface">
            Processos Recentes
          </h2>
          <p className="font-body-sm text-xs text-on-surface-variant">
            Últimos processos de dispensa registrados no sistema
          </p>
        </div>

        <div className="flex items-center gap-xs">
          <Link
            href="/processes"
            className="inline-flex items-center gap-1 rounded-md border border-outline-variant bg-surface-container-lowest px-sm py-1.5 font-label-sm text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-base"
            >
              format_list_bulleted
            </span>
            <span>Ver todos</span>
          </Link>

          <Link
            href="/processes/new"
            className="inline-flex items-center gap-1 rounded-md border border-outline-variant bg-surface-container-low px-sm py-1.5 font-label-sm text-on-surface transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-base"
            >
              add
            </span>
            <span>Nova Dispensa</span>
          </Link>
        </div>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-labelledby="recent-processes-table-caption"
        className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
      >
        <table className="w-full text-left font-body-sm">
          <caption id="recent-processes-table-caption" className="sr-only">
            Lista de processos de dispensa recentes
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
                Objeto
              </th>
              <th
                scope="col"
                className="hidden px-md py-3 font-semibold text-xs uppercase tracking-wider md:table-cell"
              >
                Departamento
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
            {processes.map((process) => {
              const formattedNumber = formatProcessNumber(
                process.number,
                process.year,
              );
              const processTitle =
                process.title || process.object || "Sem título";
              return (
                <tr
                  key={process.id}
                  className="transition-colors hover:bg-surface-container-low/60"
                >
                  <th
                    scope="row"
                    className="whitespace-nowrap px-md py-3 font-semibold text-primary"
                  >
                    <Link
                      href={`/processes/${process.id}`}
                      className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {formattedNumber}
                    </Link>
                  </th>
                  <td
                    className="px-md py-3 font-medium text-on-surface max-w-xs md:max-w-md truncate"
                    title={process.object || process.title}
                  >
                    <Link
                      href={`/processes/${process.id}`}
                      className="block truncate hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {processTitle}
                    </Link>
                  </td>
                  <td className="hidden px-md py-3 text-on-surface-variant md:table-cell whitespace-nowrap">
                    {process.department}
                  </td>
                  <td className="whitespace-nowrap px-md py-3 font-medium text-on-surface">
                    {formatCurrency(process.estimatedValue)}
                  </td>
                  <td className="hidden px-md py-3 text-on-surface-variant sm:table-cell whitespace-nowrap">
                    {formatDate(process.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-md py-3 text-right">
                    <ProcessStatusBadge status={process.status} />
                  </td>
                  <td className="whitespace-nowrap px-md py-3 text-right">
                    <Link
                      href={`/processes/${process.id}`}
                      aria-label={`Ver detalhes do processo ${formattedNumber} - ${processTitle}`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-label-sm text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span>Detalhes</span>
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-base"
                      >
                        arrow_forward
                      </span>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
