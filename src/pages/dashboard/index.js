import Head from "next/head";
import { useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardOverview from "@/components/dashboard/DashboardOverview";

export async function getServerSideProps(context) {
  const { req } = context;
  const cookieHeader = req.headers.cookie ?? "";

  try {
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const host = req.headers.host;

    // 1. Authenticate user
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

    // 2. Fetch real domain-backed dashboard summary
    let initialData = null;
    try {
      const dashboardResponse = await fetch(
        `${protocol}://${host}/api/v1/dashboard`,
        {
          headers: {
            cookie: cookieHeader,
          },
        },
      );

      if (dashboardResponse.ok) {
        initialData = await dashboardResponse.json();
      }
    } catch {
      // Gracefully allow page to render with client-side fallback if server fetch fails
      initialData = null;
    }

    return {
      props: {
        user,
        initialData,
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

export default function DashboardPage({ user, initialData }) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/dashboard");
      if (!response.ok) {
        throw new Error("Não foi possível carregar os dados atualizados.");
      }
      const freshData = await response.json();
      setData(freshData);
    } catch (err) {
      setError(err.message || "Erro de conexão ao carregar dados.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <>
      <Head>
        <title>Painel de Gestão — SISD</title>
        <meta
          name="description"
          content="Painel de controle e acompanhamento de processos de dispensa de licitação do SISD."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <DashboardLayout
        user={user}
        attentionCount={data?.summary?.attentionCount ?? 0}
      >
        <DashboardOverview
          data={data}
          user={user}
          isLoading={isLoading}
          error={error}
          onRefresh={handleRefresh}
        />
      </DashboardLayout>
    </>
  );
}
