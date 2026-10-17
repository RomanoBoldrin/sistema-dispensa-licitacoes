import Link from "next/link";

export default function DashboardEmptyState({
  icon = "inbox",
  title = "Nenhum processo cadastrado",
  description = "Ainda não existem processos de dispensa registrados no sistema.",
  actionLabel = "Criar Nova Dispensa",
  actionHref = "/processes/new",
  actionIcon = "add",
  compact = false,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? "py-md px-sm" : "py-xl px-md"}`}
    >
      <div
        className="mb-sm flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>

      <h3 className="font-headline-sm font-semibold text-on-surface">
        {title}
      </h3>

      <p className="mt-1 max-w-md font-body-sm text-on-surface-variant">
        {description}
      </p>

      {actionLabel && actionHref && (
        <div className="mt-md">
          <Link
            href={actionHref}
            className="inline-flex items-center gap-xs rounded-md bg-primary px-md py-2 font-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {actionIcon && (
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-lg"
              >
                {actionIcon}
              </span>
            )}
            <span>{actionLabel}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
