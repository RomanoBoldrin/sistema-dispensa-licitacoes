import Link from "next/link";

export default function Header() {
  return (
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

        <nav
          className="hidden h-full items-center gap-md md:flex"
          aria-label="Navegação principal"
        >
          <a
            className="flex h-full items-center px-xs font-label-md text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href="#sobre"
          >
            Sobre
          </a>

          <a
            className="flex h-full items-center px-xs font-label-md text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href="#contato"
          >
            Contato
          </a>
        </nav>

        <div className="flex items-center gap-xs">
          <button
            type="button"
            className="rounded border border-primary px-sm py-xs font-label-md text-primary transition-colors hover:bg-secondary-container/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Criar conta
          </button>

          <Link
            href="/login"
            className="flex items-center gap-base rounded bg-primary-container px-sm py-xs font-label-md text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}
