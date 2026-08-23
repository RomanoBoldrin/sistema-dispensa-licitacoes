export default function FinalCTA() {
  return (
    <section className="bg-primary-container py-xl text-on-primary md:py-24">
      <div className="mx-auto flex max-w-container-max flex-col items-center gap-md px-gutter text-center">
        <h2 className="max-w-3xl font-headline-lg text-on-primary">
          Mais organização. Mais rastreabilidade. Menos burocracia.
        </h2>

        <p className="max-w-2xl font-body-lg text-on-primary-container opacity-90">
          Pronto para organizar seus processos de forma inteligente?
        </p>

        <div className="mt-sm flex w-full flex-col justify-center gap-sm sm:w-auto sm:flex-row">
          <button
            type="button"
            className="w-full rounded-lg bg-surface px-lg py-sm font-label-md text-primary-container shadow-sm transition-colors hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
          >
            Criar conta gratuitamente
          </button>

          <button
            type="button"
            className="w-full rounded-lg border border-on-primary/30 px-lg py-sm font-label-md text-on-primary transition-colors hover:bg-on-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
          >
            Falar com consultor
          </button>
        </div>
      </div>
    </section>
  );
}
