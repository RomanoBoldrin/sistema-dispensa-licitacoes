import Link from "next/link";

export default function Hero() {
  return (
    <section className="mx-auto flex max-w-container-max flex-col items-center gap-lg px-gutter py-xl text-center md:py-20">
      <h1 className="max-w-4xl font-display-lg text-on-surface">
        Gestão de dispensas de licitação, simples e organizada.
      </h1>

      <p className="max-w-2xl font-body-lg text-on-surface-variant">
        Centralize processos, fornecedores, cotações, documentos e aprovações em
        um único sistema.
      </p>

      <div className="flex w-full flex-col justify-center gap-sm sm:w-auto sm:flex-row">
        <button
          type="button"
          className="w-full rounded-lg bg-primary-container px-lg py-sm font-label-md text-on-primary shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
        >
          Criar conta
        </button>

        <Link
          href="/login"
          className="flex w-full items-center justify-center rounded-lg border border-primary px-lg py-sm font-label-md text-primary transition-colors hover:bg-primary-container/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
        >
          Entrar
        </Link>
      </div>

      {/* Dashboard Preview Mockup */}
      <div
        aria-label="Dashboard do sistema SISD"
        className="mt-md w-full max-w-5xl overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest text-left shadow-[0px_12px_24px_rgba(0,0,0,0.06)]"
      >
        {/* Window header */}
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-md py-xs">
          <div className="flex items-center gap-xs">
            <span className="h-3 w-3 rounded-full bg-error/70" />
            <span className="h-3 w-3 rounded-full bg-tertiary-container/70" />
            <span className="h-3 w-3 rounded-full bg-primary-container/70" />
            <span className="ml-xs hidden text-xs font-medium text-on-surface-variant sm:inline">
              SISD &bull; Painel de Gestão
            </span>
          </div>
          <div className="flex items-center gap-base rounded bg-surface px-sm py-0.5 text-xs text-on-surface-variant border border-outline-variant/60">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-sm text-primary"
            >
              search
            </span>
            <span className="text-outline">
              Buscar dispensas, fornecedores...
            </span>
          </div>
        </div>

        {/* Dashboard Body Preview */}
        <div className="p-md sm:p-lg space-y-md">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-sm sm:grid-cols-4">
            <div className="rounded-lg border border-outline-variant/70 bg-surface p-sm">
              <span className="font-label-sm text-on-surface-variant">
                Total de Dispensas
              </span>
              <p className="mt-1 font-headline-sm font-bold text-on-surface">
                28
              </p>
              <span className="mt-1 inline-block text-[11px] font-medium text-primary">
                +4 este mês
              </span>
            </div>

            <div className="rounded-lg border border-outline-variant/70 bg-surface p-sm">
              <span className="font-label-sm text-on-surface-variant">
                Em Cotação
              </span>
              <p className="mt-1 font-headline-sm font-bold text-primary-container">
                06
              </p>
              <span className="mt-1 inline-block text-[11px] font-medium text-secondary">
                3 aguardando prazo
              </span>
            </div>

            <div className="rounded-lg border border-outline-variant/70 bg-surface p-sm">
              <span className="font-label-sm text-on-surface-variant">
                Valor Homologado
              </span>
              <p className="mt-1 font-headline-sm font-bold text-on-surface">
                R$ 432.850
              </p>
              <span className="mt-1 inline-block text-[11px] font-medium text-outline">
                Exercício 2024
              </span>
            </div>

            <div className="rounded-lg border border-outline-variant/70 bg-surface p-sm">
              <span className="font-label-sm text-on-surface-variant">
                Economia Média
              </span>
              <p className="mt-1 font-headline-sm font-bold text-primary">
                19,4%
              </p>
              <span className="mt-1 inline-block text-[11px] font-medium text-primary">
                vs. valor de referência
              </span>
            </div>
          </div>

          {/* Mini Table Preview */}
          <div className="overflow-x-auto rounded-lg border border-outline-variant/70 bg-surface-container-lowest">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-outline-variant/70 bg-surface-container-low text-on-surface-variant">
                  <th className="px-sm py-2.5 font-medium">Processo</th>
                  <th className="px-sm py-2.5 font-medium">Objeto</th>
                  <th className="hidden px-sm py-2.5 font-medium sm:table-cell">
                    Fase
                  </th>
                  <th className="px-sm py-2.5 font-medium">Valor Estimado</th>
                  <th className="px-sm py-2.5 font-medium text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 text-on-surface">
                <tr className="hover:bg-surface-container-low/60 transition-colors">
                  <td className="whitespace-nowrap px-sm py-2.5 font-semibold text-primary">
                    DP-042/2024
                  </td>
                  <td className="px-sm py-2.5 text-on-surface">
                    Aquisição de Equipamentos de TI
                  </td>
                  <td className="hidden px-sm py-2.5 text-on-surface-variant sm:table-cell">
                    Coleta de Propostas
                  </td>
                  <td className="whitespace-nowrap px-sm py-2.5 font-medium">
                    R$ 45.200,00
                  </td>
                  <td className="px-sm py-2.5 text-right">
                    <span className="inline-flex items-center rounded-full bg-secondary-container px-2 py-0.5 text-[11px] font-medium text-primary-container">
                      Em Cotação
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-surface-container-low/60 transition-colors">
                  <td className="whitespace-nowrap px-sm py-2.5 font-semibold text-primary">
                    DP-041/2024
                  </td>
                  <td className="px-sm py-2.5 text-on-surface">
                    Manutenção Predial Preventiva
                  </td>
                  <td className="hidden px-sm py-2.5 text-on-surface-variant sm:table-cell">
                    Parecer Jurídico
                  </td>
                  <td className="whitespace-nowrap px-sm py-2.5 font-medium">
                    R$ 78.500,00
                  </td>
                  <td className="px-sm py-2.5 text-right">
                    <span className="inline-flex items-center rounded-full bg-tertiary-fixed px-2 py-0.5 text-[11px] font-medium text-tertiary-container">
                      Em Análise
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-surface-container-low/60 transition-colors">
                  <td className="whitespace-nowrap px-sm py-2.5 font-semibold text-primary">
                    DP-040/2024
                  </td>
                  <td className="px-sm py-2.5 text-on-surface">
                    Fornecimento de Material de Escritório
                  </td>
                  <td className="hidden px-sm py-2.5 text-on-surface-variant sm:table-cell">
                    Homologação
                  </td>
                  <td className="whitespace-nowrap px-sm py-2.5 font-medium">
                    R$ 14.320,00
                  </td>
                  <td className="px-sm py-2.5 text-right">
                    <span className="inline-flex items-center rounded-full bg-primary-fixed px-2 py-0.5 text-[11px] font-medium text-primary-container">
                      Homologado
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
