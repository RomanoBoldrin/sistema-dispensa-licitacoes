import FeatureCard from "./FeatureCard";

const features = [
  {
    icon: "folder_open",
    title: "Processos",
    description:
      "Inicie e acompanhe cada etapa da dispensa de forma estruturada.",
  },
  {
    icon: "storefront",
    title: "Fornecedores",
    description: "Mantenha um cadastro centralizado e histórico de interações.",
  },
  {
    icon: "request_quote",
    title: "Cotações",
    description:
      "Colete e compare propostas automaticamente em um ambiente seguro.",
  },
  {
    icon: "verified",
    title: "Documentos",
    description:
      "Gestão ágil de pareceres e aprovações com trilha de auditoria.",
  },
];

export default function Features() {
  return (
    <section id="sobre" className="bg-surface-container-low py-xl">
      <div className="mx-auto max-w-container-max px-gutter">
        <h2 className="mb-xl text-center font-headline-lg text-on-surface">
          Tudo que você precisa em um só lugar
        </h2>

        <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
