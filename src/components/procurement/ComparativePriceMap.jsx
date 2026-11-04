import {
  formatCurrency,
  formatDate,
} from "@/components/dashboard/dashboardUtils";

export default function ComparativePriceMap({
  mapData,
  onEditQuotation,
  onDeleteQuotation,
  canManage,
}) {
  if (!mapData || !mapData.hasQuotations || mapData.totalQuotations === 0) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant p-lg text-center">
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-4xl text-outline"
        >
          request_quote
        </span>
        <h3 className="mt-xs font-headline-sm font-bold text-on-surface">
          Nenhuma cotação cadastrada
        </h3>
        <p className="mx-auto mt-1 max-w-md font-body-sm text-on-surface-variant">
          Adicione propostas de fornecedores para visualizar o mapa comparativo
          de preços e a identificação da menor proposta.
        </p>
      </div>
    );
  }

  const { lowestValue, averageValue, totalQuotations, items } = mapData;

  return (
    <div className="space-y-md">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-sm sm:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md">
          <div className="flex items-center gap-xs font-label-sm text-on-surface-variant">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-base text-primary"
            >
              format_list_numbered
            </span>
            <span>Total de Cotações</span>
          </div>
          <p className="mt-1 font-headline-md font-bold text-on-surface">
            {totalQuotations}{" "}
            <span className="font-body-sm font-normal text-on-surface-variant">
              {totalQuotations === 1 ? "proposta" : "propostas"}
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-md">
          <div className="flex items-center gap-xs font-label-sm font-semibold text-primary">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-base"
            >
              star
            </span>
            <span>Menor Preço Encontrado</span>
          </div>
          <p className="mt-1 font-headline-md font-bold text-primary">
            {formatCurrency(lowestValue)}
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md">
          <div className="flex items-center gap-xs font-label-sm text-on-surface-variant">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-base text-primary"
            >
              calculate
            </span>
            <span>Preço Médio (Referência)</span>
          </div>
          <p className="mt-1 font-headline-md font-bold text-on-surface">
            {formatCurrency(averageValue)}
          </p>
        </div>
      </div>

      {/* Comparative Map Table */}
      <div className="overflow-hidden rounded-xl border border-outline-variant/70 bg-surface-container-lowest">
        <div className="border-b border-outline-variant/50 bg-surface-container-low/40 px-md py-sm">
          <h3 className="font-headline-sm font-bold text-on-surface">
            Quadro Comparativo de Propostas
          </h3>
          <p className="font-body-sm text-xs text-on-surface-variant">
            Comparação descritiva de preços para o objeto indivisível do
            processo.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm">
            <thead className="border-b border-outline-variant/50 bg-surface-container-low font-label-sm uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th scope="col" className="px-md py-3 font-semibold">
                  Classificação / Fornecedor
                </th>
                <th scope="col" className="px-md py-3 text-right font-semibold">
                  Valor Proposto
                </th>
                <th scope="col" className="px-md py-3 text-right font-semibold">
                  Diferença
                </th>
                <th scope="col" className="px-md py-3 text-right font-semibold">
                  Variação
                </th>
                <th scope="col" className="px-md py-3 font-semibold">
                  Data
                </th>
                {canManage && (
                  <th
                    scope="col"
                    className="px-md py-3 text-center font-semibold"
                  >
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  className={`transition-colors hover:bg-surface-container-low/30 ${
                    item.isLowest ? "bg-primary/5 font-medium" : ""
                  }`}
                >
                  <td className="px-md py-3.5">
                    <div className="flex items-start gap-xs">
                      <span
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          item.isLowest
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-high text-on-surface-variant"
                        }`}
                      >
                        {index + 1}º
                      </span>
                      <div>
                        <div className="flex items-center gap-xs">
                          <span className="font-semibold text-on-surface">
                            {item.supplier?.legalName || "Fornecedor"}
                          </span>
                          {item.isLowest && (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                              Menor Preço
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-on-surface-variant">
                          CNPJ: {item.supplier?.cnpj || "—"}
                          {item.supplier?.tradeName && (
                            <span className="ml-1 text-outline">
                              • ({item.supplier.tradeName})
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="mt-1 text-xs text-on-surface-variant italic">
                            &quot;{item.description}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-md py-3.5 text-right font-bold text-on-surface">
                    {formatCurrency(item.value)}
                  </td>

                  <td className="whitespace-nowrap px-md py-3.5 text-right font-label-md text-on-surface-variant">
                    {item.isLowest ? (
                      <span className="text-primary font-semibold">—</span>
                    ) : (
                      <span>+{formatCurrency(item.differenceFromLowest)}</span>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-md py-3.5 text-right font-label-md">
                    {item.isLowest ? (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                        Referência (0%)
                      </span>
                    ) : (
                      <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-xs font-semibold text-on-surface-variant">
                        +{item.varianceFromLowestPercent}%
                      </span>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-md py-3.5 font-label-sm text-on-surface-variant">
                    {item.quotedAt ? formatDate(item.quotedAt) : "—"}
                  </td>

                  {canManage && (
                    <td className="whitespace-nowrap px-md py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onEditQuotation && (
                          <button
                            type="button"
                            onClick={() => onEditQuotation(item)}
                            title="Editar Cotação"
                            aria-label={`Editar cotação de ${item.supplier?.legalName}`}
                            className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary focus-visible:outline-primary"
                          >
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined text-base"
                            >
                              edit
                            </span>
                          </button>
                        )}
                        {onDeleteQuotation && (
                          <button
                            type="button"
                            onClick={() => onDeleteQuotation(item.id)}
                            title="Excluir Cotação"
                            aria-label={`Excluir cotação de ${item.supplier?.legalName}`}
                            className="rounded p-1 text-on-surface-variant hover:bg-error/10 hover:text-error focus-visible:outline-error"
                          >
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined text-base"
                            >
                              delete
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-outline-variant/40 bg-surface-container-low/20 px-md py-2.5 font-body-sm text-xs text-on-surface-variant">
          Nota: O mapa comparativo identifica a menor proposta para fins de
          instrução processual. A escolha e adjudicação do fornecedor ocorrem em
          etapa própria de seleção e justificativa.
        </div>
      </div>
    </div>
  );
}
