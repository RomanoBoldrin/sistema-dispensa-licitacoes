import { STATUS_LABELS, STATUS_BADGE_STYLES } from "./dashboardUtils";

export default function ProcessStatusBadge({ status, className = "" }) {
  const label = STATUS_LABELS[status] || status || "Desconhecido";
  const styleClasses =
    STATUS_BADGE_STYLES[status] ||
    "bg-surface-container-high text-on-surface-variant border-outline-variant";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-label-sm tracking-wide ${styleClasses} ${className}`}
      aria-label={`Status do processo: ${label}`}
    >
      {label}
    </span>
  );
}
