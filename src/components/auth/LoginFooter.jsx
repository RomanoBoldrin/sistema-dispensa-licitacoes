import Link from "next/link";

export default function LoginFooter() {
  return (
    <footer className="w-full border-t border-outline-variant bg-surface-container-lowest py-md">
      <div className="mx-auto flex max-w-container-max flex-col items-center justify-between gap-sm px-gutter text-center md:flex-row md:text-left">
        <span className="font-body-sm text-on-surface-variant">
          &copy; {new Date().getFullYear()} SISD - Sistema de Gestão de
          Dispensas. Todos os direitos reservados.
        </span>

        <nav
          className="flex flex-wrap justify-center gap-md"
          aria-label="Links institucionais"
        >
          <Link
            href="#privacidade"
            className="font-label-sm text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Privacidade
          </Link>
          <Link
            href="#termos"
            className="font-label-sm text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Termos de Uso
          </Link>
          <Link
            href="#suporte"
            className="font-label-sm text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Suporte
          </Link>
        </nav>
      </div>
    </footer>
  );
}
