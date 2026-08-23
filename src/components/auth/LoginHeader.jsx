import Link from "next/link";

export default function LoginHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-container-max items-center justify-between px-gutter">
        <Link
          href="/"
          className="flex items-center gap-xs rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="SISD - Voltar para o início"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-2xl text-primary"
          >
            gavel
          </span>
          <span className="font-headline-md font-bold tracking-tight text-primary">
            SISD
          </span>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-xs rounded px-2 py-1 font-label-md text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-lg"
          >
            arrow_back
          </span>
          <span>Voltar para o início</span>
        </Link>
      </div>
    </header>
  );
}
