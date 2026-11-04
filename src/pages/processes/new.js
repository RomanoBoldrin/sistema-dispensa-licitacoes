import Head from "next/head";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DFDWizard from "@/components/demand-formalization/DemandFormalizationWizard.jsx";

export async function getServerSideProps(context) {
  const { req } = context;
  const cookieHeader = req.headers.cookie ?? "";

  try {
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const host = req.headers.host;

    const userResponse = await fetch(`${protocol}://${host}/api/v1/user`, {
      headers: {
        cookie: cookieHeader,
      },
    });

    if (!userResponse.ok) {
      return {
        redirect: {
          destination: "/login",
          permanent: false,
        },
      };
    }

    const user = await userResponse.json();

    let departments = [];
    try {
      const processesResponse = await fetch(
        `${protocol}://${host}/api/v1/processes?pageSize=1`,
        {
          headers: {
            cookie: cookieHeader,
          },
        },
      );
      if (processesResponse.ok) {
        const listData = await processesResponse.json();
        departments = listData.departments || [];
      }
    } catch {
      departments = [];
    }

    return {
      props: {
        user,
        departments,
      },
    };
  } catch {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }
}

export default function NewProcessPage({ user = null, departments = [] }) {
  const isForbiddenRole = user?.role === "APROVADOR";

  return (
    <>
      <Head>
        <title>Nova Dispensa e DFD — SISD</title>
        <meta
          name="description"
          content="Iniciar novo processo de dispensa de licitação e Documento de Formalização da Demanda (DFD)"
        />
      </Head>

      <DashboardLayout user={user}>
        <div className="mx-auto max-w-3xl space-y-md">
          <div className="flex flex-col gap-xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-headline-lg font-bold text-on-surface">
                Novo Processo de Dispensa (DFD)
              </h1>
              <p className="mt-1 font-body-md text-on-surface-variant">
                Formalize a demanda para iniciar um novo processo de dispensa de
                licitação em rascunho.
              </p>
            </div>

            <Link
              href="/processes"
              className="inline-flex items-center gap-xs self-start rounded-md border border-outline-variant bg-surface-container-lowest px-sm py-2 font-label-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-lg"
              >
                arrow_back
              </span>
              <span>Lista de Processos</span>
            </Link>
          </div>

          {isForbiddenRole ? (
            <div
              role="alert"
              className="rounded-xl border border-error/30 bg-error-container/40 p-md text-on-error-container"
            >
              <h2 className="font-headline-sm font-bold">
                Perfil sem permissão para abertura de processo
              </h2>
              <p className="mt-1 font-body-sm">
                Usuários com perfil <strong>Aprovador</strong> atuam na revisão
                e decisão de processos submetidos, não podendo iniciar novos
                processos.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-xs">
              <DFDWizard user={user} departments={departments} />
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
