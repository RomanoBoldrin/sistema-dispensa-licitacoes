import Head from "next/head";
import Header from "@/components/home/Header";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import Workflow from "@/components/home/Workflow";
import FinalCTA from "@/components/home/FinalCTA";
import Footer from "@/components/home/Footer";

export default function Home() {
  return (
    <>
      <Head>
        <title>SISD - Sistema de Gestão de Dispensas de Licitação</title>
        <meta
          name="description"
          content="Centralize processos, fornecedores, cotações, documentos e aprovações em um único sistema simples e organizado."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex min-h-screen flex-col bg-background text-on-background">
        <Header />
        <main className="flex-1">
          <Hero />
          <Features />
          <Workflow />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </>
  );
}
