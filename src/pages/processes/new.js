import Head from "next/head";
import Link from "next/link";
import DFDWizard from "@/components/dfd/DFDWizard";

export default function NewProcessPage() {
  return (
    <>
      <Head>
        <title>Novo DFD — SISD</title>
        <meta
          name="description"
          content="Criar novo Documento de Formalização da Demanda"
        />
      </Head>

      <div className="flex min-h-screen flex-col bg-background text-on-background">
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
              href="/dashboard"
              className="flex items-center gap-xs rounded px-2 py-1 font-label-md text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-lg"
              >
                arrow_back
              </span>
              <span>Voltar ao painel</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-gutter py-lg">
          <div className="mx-auto max-w-3xl">
            <div className="mb-md">
              <h1 className="font-headline-lg font-bold text-on-surface">
                Novo Documento de Formalização da Demanda
              </h1>
              <p className="mt-1 font-body-md text-on-surface-variant">
                Preencha as informações abaixo para iniciar um novo
                processo de dispensa de licitação.
              </p>
            </div>

            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
              <DFDWizard />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
