import Head from "next/head";
import LoginHeader from "@/components/auth/LoginHeader";
import LoginForm from "@/components/auth/LoginForm";
import LoginFooter from "@/components/auth/LoginFooter";

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Entrar - SISD</title>
        <meta
          name="description"
          content="Acesse o SISD - Sistema de Gestão de Dispensas de Licitação para gerenciar seus processos."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex min-h-screen flex-col bg-background text-on-background">
        <LoginHeader />

        <main className="flex flex-1 items-center justify-center px-gutter py-xl sm:py-16">
          <div className="w-full max-w-[28rem] rounded-xl border border-outline-variant bg-surface-container-lowest p-md sm:p-lg shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
            <div className="mb-md text-left">
              <h1 className="font-headline-md font-bold tracking-tight text-on-surface">
                Acesse sua conta
              </h1>
              <p className="mt-1 font-body-sm text-on-surface-variant">
                Entre com suas credenciais para gerenciar processos.
              </p>
            </div>

            <LoginForm />
          </div>
        </main>

        <LoginFooter />
      </div>
    </>
  );
}
