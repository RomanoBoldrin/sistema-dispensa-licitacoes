import DashboardEmptyState from "./DashboardEmptyState";

const PALETTE = [
  "var(--color-primary-container)",
  "var(--color-secondary)",
  "var(--color-tertiary)",
  "var(--color-primary)",
  "var(--color-secondary-container)",
  "var(--color-outline)",
];

export default function DepartmentDistributionChart({ data = [] }) {
  const activeItems = data.filter((d) => d.value > 0);
  const total = activeItems.reduce((acc, d) => acc + d.value, 0);

  if (activeItems.length === 0 || total === 0) {
    return (
      <div className="flex h-full flex-col justify-between rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-md">
        <div className="border-b border-outline-variant/50 pb-sm mb-md flex items-center justify-between">
          <div>
            <h2 className="font-headline-sm font-semibold text-on-surface">
              Processos por Secretaria / Departamento
            </h2>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Distribuição por órgão solicitante
            </p>
          </div>
        </div>
        <DashboardEmptyState
          icon="account_balance"
          title="Sem dados de departamentos"
          description="Quando processos forem associados às secretarias e departamentos, a distribuição por órgão será exibida aqui."
          compact
          actionLabel=""
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-md">
      <div className="border-b border-outline-variant/50 pb-sm mb-md flex items-center justify-between">
        <div>
          <h2 className="font-headline-sm font-semibold text-on-surface">
            Processos por Secretaria / Departamento
          </h2>
          <p className="font-body-sm text-xs text-on-surface-variant">
            {activeItems.length}{" "}
            {activeItems.length === 1
              ? "departamento com processos"
              : "departamentos com processos"}
          </p>
        </div>
      </div>

      <div className="space-y-sm py-xs">
        {activeItems.map((item, i) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={item.id || item.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span
                  className="font-medium text-on-surface truncate pr-2 max-w-[220px] sm:max-w-xs"
                  title={item.label}
                >
                  {item.label}
                </span>
                <span className="shrink-0 font-semibold text-on-surface">
                  {item.value} {item.value === 1 ? "processo" : "processos"} (
                  {pct}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: PALETTE[i % PALETTE.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
