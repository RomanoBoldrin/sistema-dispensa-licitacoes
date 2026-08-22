export default function Workflow() {
  return (
    <section className="mx-auto max-w-container-max px-gutter py-xl md:py-24">
      <div className="flex flex-col items-center gap-xl md:flex-row">
        <div className="flex-1 space-y-md">
          <h2 className="font-headline-lg text-on-surface">
            Fluxo de trabalho linear e previsível
          </h2>

          <p className="font-body-lg text-on-surface-variant">
            Acompanhe visualmente em que estágio cada processo se encontra,
            eliminando gargalos e garantindo a conformidade legal do início ao
            fim.
          </p>

          <button
            type="button"
            className="mt-sm rounded bg-primary-container px-lg py-sm font-label-md text-on-primary shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Ver demonstração
          </button>
        </div>

        <div className="w-full flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
          <div className="relative ml-sm space-y-lg border-l-2 border-surface-container-high pl-xl">
            {/* Step 1 - Completed */}
            <div className="relative">
              <div className="absolute -left-[42px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary-container ring-4 ring-surface-container-lowest">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[14px] text-on-primary"
                >
                  check
                </span>
              </div>

              <h3 className="font-label-md font-bold text-primary-container">
                Criação
              </h3>

              <p className="mt-xs font-body-sm text-on-surface-variant">
                Abertura do processo e justificativa.
              </p>
            </div>

            {/* Step 2 - Completed */}
            <div className="relative">
              <div className="absolute -left-[42px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary-container ring-4 ring-surface-container-lowest">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[14px] text-on-primary"
                >
                  check
                </span>
              </div>

              <h3 className="font-label-md font-bold text-primary-container">
                Análise
              </h3>

              <p className="mt-xs font-body-sm text-on-surface-variant">
                Revisão técnica inicial.
              </p>
            </div>

            {/* Step 3 - Active */}
            <div className="relative">
              <div className="absolute -left-[42px] top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary-container bg-surface-container-lowest ring-4 ring-surface-container-lowest">
                <div className="h-2 w-2 rounded-full bg-primary-container" />
              </div>

              <h3 className="font-label-md font-bold text-on-surface">
                Cotações
              </h3>

              <p className="mt-xs font-body-sm text-on-surface-variant">
                Aguardando recebimento de propostas.
              </p>
            </div>

            {/* Step 4 - Pending */}
            <div className="relative">
              <div className="absolute -left-[42px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-surface-container-highest ring-4 ring-surface-container-lowest" />

              <h3 className="font-label-md text-outline">
                Fornecedor &amp; Aprovação
              </h3>

              <p className="mt-xs font-body-sm text-outline">
                Seleção e validação jurídica.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
