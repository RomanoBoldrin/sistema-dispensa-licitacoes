import Link from "next/link";
import { useRouter } from "next/router";

export default function DashboardSidebar({
  isOpen = false,
  onClose = () => {},
  userRole = "SOLICITANTE",
  attentionCount = 0,
}) {
  const router = useRouter();

  const navGroups = [
    {
      group: "Principal",
      items: [
        {
          label: "Início / Dashboard",
          href: "/dashboard",
          icon: "dashboard",
          isActualRoute: true,
        },
        {
          label: "Nova Dispensa",
          href: "/processes/new",
          icon: "add_circle",
          isActualRoute: true,
          badge: "Criar DFD",
          badgeColor: "bg-primary text-on-primary",
        },
        {
          label: "Lista de Processos",
          href: null,
          icon: "format_list_bulleted",
          badge: "Em breve",
        },
      ],
    },
    {
      group: "Gestão & Decisão",
      items: [
        {
          label: "Caixa de Aprovações",
          href: null,
          icon: "fact_check",
          badge:
            userRole === "APROVADOR" && attentionCount > 0
              ? `${attentionCount} pendente(s)`
              : "Em breve",
          badgeColor:
            userRole === "APROVADOR" && attentionCount > 0
              ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
              : undefined,
        },
        {
          label: "Módulo de Publicação",
          href: null,
          icon: "public",
          badge: "Em breve",
        },
      ],
    },
    {
      group: "Transparência & Dados",
      items: [
        {
          label: "Consulta Pública",
          href: null,
          icon: "search",
          badge: "Em breve",
        },
        {
          label: "Relatórios Gerenciais",
          href: null,
          icon: "assessment",
          badge: "Em breve",
        },
      ],
    },
    {
      group: "Configuração",
      items: [
        {
          label: "Administração",
          href: null,
          icon: "admin_panel_settings",
          badge: "Em breve",
          adminOnly: true,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-on-surface/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        id="dashboard-sidebar"
        aria-label="Navegação Principal"
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-outline-variant bg-surface-container-lowest transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header inside Sidebar for mobile and desktop */}
        <div className="flex h-16 items-center justify-between border-b border-outline-variant px-md">
          <Link
            href="/dashboard"
            className="flex items-center gap-xs rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="SISD - Início do Painel"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-2xl text-primary"
            >
              gavel
            </span>
            <div className="flex flex-col">
              <span className="font-headline-sm font-bold tracking-tight text-primary leading-none">
                SISD
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-on-surface-variant">
                Dispensas de Licitação
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu de navegação"
            className="flex h-8 w-8 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container lg:hidden"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-xl"
            >
              close
            </span>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-sm py-md space-y-md">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.adminOnly || userRole === "ADMIN",
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.group}>
                <span className="px-sm text-[11px] font-bold uppercase tracking-wider text-outline">
                  {group.group}
                </span>

                <ul className="mt-1.5 space-y-1">
                  {visibleItems.map((item) => {
                    const isActive = item.href && router.asPath === item.href;

                    if (item.isActualRoute && item.href) {
                      return (
                        <li key={item.label}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            aria-current={isActive ? "page" : undefined}
                            className={`flex items-center justify-between rounded-md px-sm py-2 font-label-md transition-colors ${
                              isActive
                                ? "bg-primary-container/15 font-semibold text-primary"
                                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                            } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
                          >
                            <div className="flex items-center gap-xs truncate">
                              <span
                                aria-hidden="true"
                                className={`material-symbols-outlined text-lg ${
                                  isActive
                                    ? "text-primary"
                                    : "text-on-surface-variant"
                                }`}
                              >
                                {item.icon}
                              </span>
                              <span className="truncate">{item.label}</span>
                            </div>

                            {item.badge && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  item.badgeColor ||
                                  "bg-surface-container text-on-surface-variant"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    }

                    // Disabled / placeholder item for unreleased modules
                    return (
                      <li key={item.label}>
                        <div
                          className="flex cursor-not-allowed items-center justify-between rounded-md px-sm py-2 font-label-md text-outline opacity-70"
                          title="Módulo em fase de desenvolvimento"
                          aria-disabled="true"
                        >
                          <div className="flex items-center gap-xs truncate">
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined text-lg text-outline"
                            >
                              {item.icon}
                            </span>
                            <span className="truncate">{item.label}</span>
                          </div>

                          <span className="rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-medium text-outline">
                            {item.badge || "Em breve"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Footer info in sidebar */}
        <div className="border-t border-outline-variant p-sm">
          <div className="rounded-md bg-surface-container-low p-2 text-center text-[11px] text-on-surface-variant">
            <span className="font-semibold text-primary">
              Lei nº 14.133/2021
            </span>
            <p className="mt-0.5 text-[10px] text-outline">
              Regime de Compras Públicas
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
