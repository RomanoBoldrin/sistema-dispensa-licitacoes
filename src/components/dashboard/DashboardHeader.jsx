import { useState } from "react";
import { useRouter } from "next/router";
import { ROLE_LABELS } from "./dashboardUtils";

export default function DashboardHeader({ user, onMenuToggle = () => {} }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await fetch("/api/v1/auth/sessions", { method: "DELETE" });
    } finally {
      router.push("/login");
    }
  };

  const roleLabel = ROLE_LABELS[user?.role] || user?.role || "Usuário";

  return (
    <header className="sticky top-0 z-30 w-full border-b border-outline-variant bg-surface-container-lowest/95 backdrop-blur-sm">
      <div className="flex h-16 w-full items-center justify-between px-gutter">
        {/* Left side: Mobile menu toggle + page context */}
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="Abrir menu de navegação"
            aria-controls="dashboard-sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container lg:hidden"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-xl"
            >
              menu
            </span>
          </button>

          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="hidden material-symbols-outlined text-xl text-primary sm:inline"
            >
              dashboard
            </span>
            <div className="flex flex-col">
              <h1 className="font-headline-sm text-base font-bold text-on-surface sm:text-lg">
                Painel de Gestão
              </h1>
              <span className="hidden font-body-sm text-[11px] text-on-surface-variant sm:inline">
                Visão Geral das Dispensas
              </span>
            </div>
          </div>
        </div>

        {/* Right side: User info + Logout */}
        <div className="flex items-center gap-sm">
          {user && (
            <div className="flex items-center gap-xs">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container/20 text-xs font-bold text-primary"
                aria-hidden="true"
              >
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>

              <div className="hidden flex-col text-left sm:flex">
                <span className="font-label-md text-xs font-semibold text-on-surface leading-tight">
                  {user.name}
                </span>
                <span className="font-label-sm text-[10px] text-on-surface-variant">
                  {roleLabel}
                </span>
              </div>
            </div>
          )}

          <div className="h-6 w-px bg-outline-variant/60" aria-hidden="true" />

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-busy={isLoggingOut}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 font-label-md text-xs text-on-surface-variant transition-colors hover:bg-surface-container hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              aria-hidden="true"
              className={`material-symbols-outlined text-lg ${
                isLoggingOut ? "animate-spin" : ""
              }`}
            >
              {isLoggingOut ? "progress_activity" : "logout"}
            </span>
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
