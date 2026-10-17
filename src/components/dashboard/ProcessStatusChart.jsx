import { useState } from "react";
import DashboardEmptyState from "./DashboardEmptyState";

const PALETTE = [
  "var(--color-primary)",
  "var(--color-primary-container)",
  "var(--color-secondary)",
  "var(--color-secondary-container)",
  "var(--color-tertiary)",
  "var(--color-tertiary-container)",
  "var(--color-outline)",
  "var(--color-error)",
];

export default function ProcessStatusChart({ data = [] }) {
  const [viewType, setViewType] = useState("donut");

  const total = data.reduce((acc, item) => acc + (item.value || 0), 0);
  const activeItems = data.filter((item) => item.value > 0);

  if (total === 0) {
    return (
      <div className="flex h-full flex-col justify-between rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-md">
        <div className="border-b border-outline-variant/50 pb-sm mb-md flex items-center justify-between">
          <div>
            <h2 className="font-headline-sm font-semibold text-on-surface">
              Distribuição por Status
            </h2>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Fase atual dos processos de dispensa
            </p>
          </div>
        </div>
        <DashboardEmptyState
          icon="pie_chart"
          title="Sem dados de status"
          description="A distribuição por status será calculada automaticamente assim que novos processos forem registrados."
          compact
          actionLabel=""
        />
      </div>
    );
  }

  // Rosca calculations
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * r;

  const dashes = activeItems.map((d) => (d.value / total) * circumference);
  const offsets = dashes.map((_, i) =>
    dashes.slice(0, i).reduce((sum, v) => sum + v, 0),
  );

  return (
    <div className="flex flex-col justify-between rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-md">
      <div className="border-b border-outline-variant/50 pb-sm mb-md flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-headline-sm font-semibold text-on-surface">
            Distribuição por Status
          </h2>
          <p className="font-body-sm text-xs text-on-surface-variant">
            {total}{" "}
            {total === 1 ? "processo registrado" : "processos registrados"}
          </p>
        </div>

        <div
          role="group"
          aria-label="Tipo de visualização de status"
          className="flex items-center gap-1 rounded-full border border-outline-variant/70 bg-surface-container-low p-1"
        >
          <button
            type="button"
            title="Gráfico em rosca"
            aria-pressed={viewType === "donut"}
            onClick={() => setViewType("donut")}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              viewType === "donut"
                ? "bg-primary-container text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-base"
            >
              donut_large
            </span>
          </button>
          <button
            type="button"
            title="Lista em barras"
            aria-pressed={viewType === "bars"}
            onClick={() => setViewType("bars")}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              viewType === "bars"
                ? "bg-primary-container text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-base"
            >
              segment
            </span>
          </button>
        </div>
      </div>

      {viewType === "donut" ? (
        <div className="flex flex-col items-center gap-md py-sm sm:flex-row sm:justify-around">
          <div className="relative shrink-0">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              role="img"
              aria-label={`Gráfico em rosca com total de ${total} processos`}
            >
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="var(--color-surface-container-high)"
                strokeWidth={strokeWidth}
              />
              {activeItems.map((item, i) => (
                <circle
                  key={item.status || item.label}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashes[i]} ${circumference - dashes[i]}`}
                  strokeDashoffset={-offsets[i]}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              ))}
              <text
                x={cx}
                y={cy - 2}
                textAnchor="middle"
                className="fill-on-surface font-headline-sm font-bold"
                style={{ fontSize: 24, fontWeight: 700 }}
              >
                {total}
              </text>
              <text
                x={cx}
                y={cy + 18}
                textAnchor="middle"
                className="fill-on-surface-variant font-label-sm"
                style={{ fontSize: 11 }}
              >
                total
              </text>
            </svg>
          </div>

          <div className="flex flex-col gap-1.5 w-full max-w-xs">
            {activeItems.map((item, i) => {
              const pct = Math.round((item.value / total) * 100);
              return (
                <div
                  key={item.status || item.label}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="truncate text-on-surface-variant font-medium">
                      {item.label}
                    </span>
                  </div>
                  <span className="font-semibold text-on-surface ml-2">
                    {item.value} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-sm py-xs">
          {activeItems.map((item, i) => {
            const pct = Math.round((item.value / total) * 100);
            return (
              <div key={item.status || item.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-on-surface-variant">
                    {item.label}
                  </span>
                  <span className="font-semibold text-on-surface">
                    {item.value} · {pct}%
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
      )}
    </div>
  );
}
