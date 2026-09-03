import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

// ─────────────────────────────────────────────
// Dados derivados do domínio do projeto
// (enum ProcessStatus / model Process / Department em prisma/schema.prisma)
// Substitua os arrays abaixo por dados vindos da sua API quando estiver pronta.
// ─────────────────────────────────────────────

const STATUS_LABELS = {
  DRAFT: "Rascunho",
  IN_ANALYSIS: "Em Análise",
  PRICE_RESEARCH: "Pesquisa de Preços",
  SUPPLIER_SELECTED: "Fornecedor Selecionado",
  AWAITING_APPROVAL: "Aguardando Aprovação",
  REJECTED: "Rejeitado",
  APPROVED: "Aprovado",
  COMPLETED: "Concluído",
};

const STATUS_BADGE_STYLES = {
  DRAFT: "bg-surface-container-high text-on-surface-variant",
  IN_ANALYSIS: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  PRICE_RESEARCH: "bg-secondary-container text-on-secondary-container",
  SUPPLIER_SELECTED: "bg-secondary-container text-on-secondary-container",
  AWAITING_APPROVAL: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  REJECTED: "bg-error-container text-on-error-container",
  APPROVED: "bg-primary-fixed text-on-primary-fixed-variant",
  COMPLETED: "bg-primary-fixed text-on-primary-fixed-variant",
};

const statusDistribution = [
  { label: "Concluído", value: 12 },
  { label: "Aprovado", value: 5 },
  { label: "Aguardando Aprovação", value: 4 },
  { label: "Fornecedor Selecionado", value: 3 },
  { label: "Pesquisa de Preços", value: 6 },
  { label: "Em Análise", value: 7 },
  { label: "Rascunho", value: 3 },
  { label: "Rejeitado", value: 2 },
];
const totalProcesses = statusDistribution.reduce((acc, s) => acc + s.value, 0);

const departmentDistribution = [
  { label: "Tecnologia da Informação", value: 11 },
  { label: "Administração", value: 8 },
  { label: "Infraestrutura", value: 7 },
  { label: "Saúde", value: 6 },
];

const recentProcesses = [
  {
    id: "1",
    number: 42,
    year: 2026,
    title: "Aquisição de Equipamentos de TI",
    department: "Tecnologia da Informação",
    estimatedValue: 45200.0,
    status: "PRICE_RESEARCH",
  },
  {
    id: "2",
    number: 41,
    year: 2026,
    title: "Manutenção Predial Preventiva",
    department: "Infraestrutura",
    estimatedValue: 78500.0,
    status: "AWAITING_APPROVAL",
  },
  {
    id: "3",
    number: 40,
    year: 2026,
    title: "Fornecimento de Material de Escritório",
    department: "Administração",
    estimatedValue: 14320.0,
    status: "APPROVED",
  },
  {
    id: "4",
    number: 39,
    year: 2026,
    title: "Contratação de Serviço de Limpeza",
    department: "Administração",
    estimatedValue: 32900.0,
    status: "COMPLETED",
  },
  {
    id: "5",
    number: 38,
    year: 2026,
    title: "Aquisição de Insumos Hospitalares",
    department: "Saúde",
    estimatedValue: 21750.0,
    status: "IN_ANALYSIS",
  },
  {
    id: "6",
    number: 37,
    year: 2026,
    title: "Renovação de Licenças de Software",
    department: "Tecnologia da Informação",
    estimatedValue: 58400.0,
    status: "REJECTED",
  },
];

function formatCurrency(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const totalHomologado = recentProcesses
  .filter((p) => p.status === "COMPLETED" || p.status === "APPROVED")
  .reduce((acc, p) => acc + p.estimatedValue, 0);

const emAndamento = statusDistribution
  .filter((s) =>
    [
      "Em Análise",
      "Pesquisa de Preços",
      "Fornecedor Selecionado",
      "Aguardando Aprovação",
    ].includes(s.label),
  )
  .reduce((acc, s) => acc + s.value, 0);

// ─────────────────────────────────────────────
// Paleta de cores (tokens do design system em globals.css)
// ─────────────────────────────────────────────

const PALETTE = [
  "var(--color-primary-container)",
  "var(--color-tertiary-container)",
  "var(--color-secondary)",
  "var(--color-primary)",
  "var(--color-tertiary)",
  "var(--color-error-container)",
  "var(--color-outline)",
  "var(--color-secondary-container)",
];

// ─────────────────────────────────────────────
// Helpers de geometria SVG (pizza / rosca)
// ─────────────────────────────────────────────

function polarToCartesian(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function describeSlice(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

// ─────────────────────────────────────────────
// Componentes de gráfico
// ─────────────────────────────────────────────

function DonutChart({ data, total }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 78;
  const strokeWidth = 30;
  const circumference = 2 * Math.PI * r;

  // Calcula dash e offset de cada fatia de forma imutável (sem reatribuir variável)
  const dashes = data.map((d) => (d.value / total) * circumference);
  const offsets = dashes.map((_, i) =>
    dashes.slice(0, i).reduce((sum, v) => sum + v, 0),
  );

  return (
    <div className="flex flex-col items-center gap-md sm:flex-row sm:items-center sm:justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--color-surface-container-high)"
          strokeWidth={strokeWidth}
        />
        {data.map((d, i) => (
          <circle
            key={d.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashes[i]} ${circumference - dashes[i]}`}
            strokeDashoffset={-offsets[i]}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        ))}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-on-surface"
          style={{ fontSize: 28, fontWeight: 700 }}
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          className="fill-on-surface-variant"
          style={{ fontSize: 11 }}
        >
          total
        </text>
      </svg>
      <ChartLegend data={data} total={total} />
    </div>
  );
}

function PieChart({ data, total }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 95;

  // Calcula os ângulos de início/fim de cada fatia de forma imutável
  const angles = data.map((d) => (d.value / total) * 360);
  const startAngles = angles.map((_, i) =>
    angles.slice(0, i).reduce((sum, v) => sum + v, 0),
  );

  return (
    <div className="flex flex-col items-center gap-md sm:flex-row sm:items-center sm:justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          const path = describeSlice(
            cx,
            cy,
            r,
            startAngles[i],
            startAngles[i] + angles[i],
          );
          return (
            <path
              key={d.label}
              d={path}
              fill={PALETTE[i % PALETTE.length]}
              stroke="var(--color-surface-container-lowest)"
              strokeWidth={2}
            />
          );
        })}
      </svg>
      <ChartLegend data={data} total={total} />
    </div>
  );
}

function VerticalBarChart({ data, total }) {
  const width = 480;
  const height = 220;
  const paddingBottom = 28;
  const paddingTop = 12;
  const chartHeight = height - paddingBottom - paddingTop;
  const max = Math.max(...data.map((d) => d.value));
  const barWidth = Math.min(48, (width - 24) / data.length - 12);
  const gap = (width - barWidth * data.length) / (data.length + 1);

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {data.map((d, i) => {
          const barHeight = (d.value / max) * chartHeight;
          const x = gap + i * (barWidth + gap);
          const y = paddingTop + (chartHeight - barHeight);
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={PALETTE[i % PALETTE.length]}
              />
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-on-surface"
                style={{ fontSize: 11, fontWeight: 600 }}
              >
                {d.value}
              </text>
            </g>
          );
        })}
        <line
          x1={0}
          y1={height - paddingBottom}
          x2={width}
          y2={height - paddingBottom}
          stroke="var(--color-outline-variant)"
          strokeWidth={1}
        />
      </svg>
      <ChartLegend data={data} total={total} compact />
    </div>
  );
}

function LineChart({ data, total }) {
  const width = 480;
  const height = 220;
  const paddingBottom = 28;
  const paddingTop = 20;
  const paddingX = 24;
  const chartHeight = height - paddingBottom - paddingTop;
  const max = Math.max(...data.map((d) => d.value));
  const stepX = (width - paddingX * 2) / (data.length - 1 || 1);

  const points = data.map((d, i) => {
    const x = paddingX + i * stepX;
    const y = paddingTop + (chartHeight - (d.value / max) * chartHeight);
    return { x, y, d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    height - paddingBottom
  } L ${points[0].x} ${height - paddingBottom} Z`;

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={areaPath}
          fill="var(--color-primary-container)"
          opacity={0.12}
        />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-primary-container)"
          strokeWidth={2.5}
        />
        {points.map((p) => (
          <g key={p.d.label}>
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill="var(--color-primary-container)"
            />
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              className="fill-on-surface"
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              {p.d.value}
            </text>
          </g>
        ))}
        <line
          x1={0}
          y1={height - paddingBottom}
          x2={width}
          y2={height - paddingBottom}
          stroke="var(--color-outline-variant)"
          strokeWidth={1}
        />
      </svg>
      <ChartLegend data={data} total={total} compact />
    </div>
  );
}

function ProgressList({ data, total }) {
  return (
    <div className="space-y-sm">
      {data.map((d, i) => (
        <div key={d.label}>
          <div className="mb-1 flex items-center justify-between">
            <span className="font-body-sm text-on-surface-variant">
              {d.label}
            </span>
            <span className="font-label-sm text-on-surface">
              {d.value} · {Math.round((d.value / total) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(d.value / total) * 100}%`,
                backgroundColor: PALETTE[i % PALETTE.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartLegend({ data, total, compact }) {
  return (
    <div
      className={
        compact
          ? "mt-sm flex flex-wrap gap-x-sm gap-y-1"
          : "flex flex-col gap-1"
      }
    >
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
          />
          <span className="font-body-sm text-on-surface-variant">
            {d.label}{" "}
            <span className="font-label-sm text-on-surface">
              ({Math.round((d.value / total) * 100)}%)
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Card com seletor de tipo de visualização
// ─────────────────────────────────────────────

const CHART_TYPES = [
  { id: "donut", label: "Rosca", icon: "donut_large" },
  { id: "pie", label: "Pizza", icon: "pie_chart" },
  { id: "bar", label: "Barras", icon: "bar_chart" },
  { id: "line", label: "Linear", icon: "show_chart" },
  { id: "progress", label: "Progresso", icon: "segment" },
];

function ChartCard({ title, data, defaultType = "donut" }) {
  const [chartType, setChartType] = useState(defaultType);
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-md">
      <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
        <h2 className="font-headline-sm font-semibold text-on-surface">
          {title}
        </h2>

        <div
          role="group"
          aria-label="Selecionar tipo de gráfico"
          className="flex items-center gap-1 rounded-full border border-outline-variant/70 bg-surface-container-low p-1"
        >
          {CHART_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              title={type.label}
              aria-pressed={chartType === type.id}
              onClick={() => setChartType(type.id)}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                chartType === type.id
                  ? "bg-primary-container text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-lg"
              >
                {type.icon}
              </span>
            </button>
          ))}
        </div>
      </div>

      {chartType === "donut" && <DonutChart data={data} total={total} />}
      {chartType === "pie" && <PieChart data={data} total={total} />}
      {chartType === "bar" && <VerticalBarChart data={data} total={total} />}
      {chartType === "line" && <LineChart data={data} total={total} />}
      {chartType === "progress" && <ProgressList data={data} total={total} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// Página do Dashboard
// ─────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <>
      <Head>
        <title>Painel de Gestão - SISD</title>
        <meta
          name="description"
          content="Painel de gestão de processos de dispensa de licitação."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex min-h-screen flex-col bg-background text-on-background">
        {/* Topbar */}
        <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 w-full max-w-container-max items-center justify-between px-gutter">
            <div className="flex items-center gap-xs">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-2xl text-primary"
              >
                gavel
              </span>
              <span className="font-headline-md font-bold tracking-tight text-primary">
                SISD
              </span>
            </div>

            <Link
              href="/"
              className="flex items-center gap-base rounded px-sm py-xs font-label-md text-on-surface-variant transition-colors hover:text-primary"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-lg"
              >
                logout
              </span>
              Sair
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-container-max flex-1 px-gutter py-lg">
          <div className="mb-lg">
            <h1 className="font-headline-lg font-bold text-on-surface">
              Painel de Gestão
            </h1>
            <p className="mt-1 font-body-md text-on-surface-variant">
              Visão geral dos processos de dispensa de licitação.
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-sm md:grid-cols-4">
            <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-sm">
              <span className="font-label-sm text-on-surface-variant">
                Total de Processos
              </span>
              <p className="mt-1 font-headline-sm font-bold text-on-surface">
                {totalProcesses}
              </p>
              <span className="mt-1 inline-block text-[11px] font-medium text-primary">
                {statusDistribution.find((s) => s.label === "Rascunho")
                  ?.value ?? 0}{" "}
                em rascunho
              </span>
            </div>

            <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-sm">
              <span className="font-label-sm text-on-surface-variant">
                Em Andamento
              </span>
              <p className="mt-1 font-headline-sm font-bold text-primary-container">
                {emAndamento}
              </p>
              <span className="mt-1 inline-block text-[11px] font-medium text-secondary">
                análise, cotação e aprovação
              </span>
            </div>

            <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-sm">
              <span className="font-label-sm text-on-surface-variant">
                Valor Homologado
              </span>
              <p className="mt-1 font-headline-sm font-bold text-on-surface">
                {formatCurrency(totalHomologado)}
              </p>
              <span className="mt-1 inline-block text-[11px] font-medium text-outline">
                aprovados + concluídos
              </span>
            </div>

            <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-sm">
              <span className="font-label-sm text-on-surface-variant">
                Rejeitados
              </span>
              <p className="mt-1 font-headline-sm font-bold text-error">
                {statusDistribution.find((s) => s.label === "Rejeitado")
                  ?.value ?? 0}
              </p>
              <span className="mt-1 inline-block text-[11px] font-medium text-error">
                requerem atenção
              </span>
            </div>
          </div>

          {/* Charts com seletor de visualização */}
          <div className="mt-lg grid grid-cols-1 gap-sm lg:grid-cols-2">
            <ChartCard
              title="Processos por Status"
              data={statusDistribution}
              defaultType="donut"
            />
            <ChartCard
              title="Processos por Departamento"
              data={departmentDistribution}
              defaultType="bar"
            />
          </div>

          {/* Recent processes table */}
          <div className="mt-lg overflow-x-auto rounded-lg border border-outline-variant/70 bg-surface-container-lowest">
            <div className="flex items-center justify-between border-b border-outline-variant/70 px-md py-sm">
              <h2 className="font-headline-sm font-semibold text-on-surface">
                Processos Recentes
              </h2>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/70 bg-surface-container-low text-on-surface-variant">
                  <th className="px-sm py-2.5 font-medium">Processo</th>
                  <th className="px-sm py-2.5 font-medium">Objeto</th>
                  <th className="hidden px-sm py-2.5 font-medium sm:table-cell">
                    Departamento
                  </th>
                  <th className="px-sm py-2.5 font-medium">Valor Estimado</th>
                  <th className="px-sm py-2.5 font-medium text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 text-on-surface">
                {recentProcesses.map((p) => (
                  <tr
                    key={p.id}
                    className="transition-colors hover:bg-surface-container-low/60"
                  >
                    <td className="whitespace-nowrap px-sm py-2.5 font-semibold text-primary">
                      DP-{String(p.number).padStart(3, "0")}/{p.year}
                    </td>
                    <td className="px-sm py-2.5 text-on-surface">{p.title}</td>
                    <td className="hidden px-sm py-2.5 text-on-surface-variant sm:table-cell">
                      {p.department}
                    </td>
                    <td className="whitespace-nowrap px-sm py-2.5 font-medium">
                      {formatCurrency(p.estimatedValue)}
                    </td>
                    <td className="px-sm py-2.5 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE_STYLES[p.status]}`}
                      >
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </>
  );
}
