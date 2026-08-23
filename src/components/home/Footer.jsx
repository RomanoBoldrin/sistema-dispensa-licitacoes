export default function Footer() {
  return (
    <footer className="w-full border-t border-outline-variant bg-surface-container-lowest">
      <div className="mx-auto flex max-w-container-max flex-col items-center justify-between gap-sm px-gutter py-lg md:flex-row">
        <div className="flex flex-col items-center gap-xs md:items-start">
          <div className="flex items-center gap-xs">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-primary text-xl"
            >
              gavel
            </span>
            <span className="font-headline-sm font-bold text-on-surface">
              SISD
            </span>
          </div>

          <span className="font-body-sm text-on-surface-variant text-center md:text-left">
            &copy; {new Date().getFullYear()} SISD - Sistema de Gestão de
            Dispensas. Todos os direitos reservados.
          </span>
        </div>

        <nav
          className="flex flex-wrap justify-center gap-md md:justify-end"
          aria-label="Links de rodapé"
        >
          <a
            className="font-label-sm text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href="#privacidade"
          >
            Privacidade
          </a>

          <a
            className="font-label-sm text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href="#termos"
          >
            Termos
          </a>

          <a
            id="contato"
            className="font-label-sm text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href="#contato"
          >
            Contato
          </a>

          <a
            className="font-label-sm text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href="#sobre"
          >
            Sobre
          </a>
        </nav>
      </div>
    </footer>
  );
}
