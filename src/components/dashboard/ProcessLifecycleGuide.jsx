import { LIFECYCLE_STAGES } from "./dashboardUtils";

export default function ProcessLifecycleGuide() {
  return (
    <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-md">
      <div className="border-b border-outline-variant/50 pb-sm mb-md">
        <h2 className="font-headline-sm font-semibold text-on-surface">
          Ciclo de Vida da Dispensa de Licitação
        </h2>
        <p className="font-body-sm text-xs text-on-surface-variant">
          Etapas obrigatórias do procedimento administrativo de contratação
          direta
        </p>
      </div>

      <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-4">
        {LIFECYCLE_STAGES.map((stage) => (
          <div
            key={stage.step}
            className="flex flex-col justify-between rounded-md border border-outline-variant/50 bg-surface-container-low/40 p-sm transition-colors hover:border-primary/40 hover:bg-surface-container-low"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-container/20 text-xs font-bold text-primary">
                  {stage.step}
                </span>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-lg text-primary"
                >
                  {stage.icon}
                </span>
              </div>
              <h3 className="font-label-sm font-semibold text-on-surface">
                {stage.title}
              </h3>
              <p className="mt-1 font-body-sm text-xs text-on-surface-variant leading-relaxed">
                {stage.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
