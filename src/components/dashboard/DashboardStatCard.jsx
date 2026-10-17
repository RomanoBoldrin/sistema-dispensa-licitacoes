export default function DashboardStatCard({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
  badge,
  helpText,
}) {
  const iconVariantStyles = {
    default: "bg-surface-container-high text-on-surface-variant",
    primary: "bg-primary-container/15 text-primary",
    secondary: "bg-secondary-container text-secondary",
    tertiary: "bg-tertiary-container/15 text-tertiary",
    error: "bg-error-container text-on-error-container",
  };

  const borderVariantStyles = {
    default: "border-outline-variant/70",
    primary: "border-primary/20",
    secondary: "border-secondary/20",
    tertiary: "border-tertiary/20",
    error: "border-error/20",
  };

  return (
    <div
      className={`relative flex flex-col justify-between rounded-lg border bg-surface-container-lowest p-md transition-shadow hover:shadow-sm ${borderVariantStyles[variant] || borderVariantStyles.default}`}
    >
      <div className="flex items-start justify-between gap-sm">
        <div className="space-y-1">
          <span className="font-label-sm text-on-surface-variant font-medium">
            {title}
          </span>
          <p className="font-headline-sm font-bold tracking-tight text-on-surface sm:text-2xl">
            {value}
          </p>
        </div>

        {icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${iconVariantStyles[variant] || iconVariantStyles.default}`}
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-xl">{icon}</span>
          </div>
        )}
      </div>

      {(subtitle || badge || helpText) && (
        <div className="mt-sm flex flex-wrap items-center justify-between gap-1 pt-2 border-t border-outline-variant/30">
          {subtitle && (
            <span className="font-body-sm text-xs text-on-surface-variant">
              {subtitle}
            </span>
          )}
          {badge && (
            <span className="inline-flex items-center rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-medium text-on-surface">
              {badge}
            </span>
          )}
          {helpText && (
            <span className="text-[11px] text-outline" title={helpText}>
              {helpText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
