import { useState } from "react";

const CATEGORIES = [
  {
    value: "IT_GOODS",
    label: "Bens de TI",
    icon: "computer",
    description: "Computadores, servidores, licenças de software",
  },
  {
    value: "COMMON_GOODS",
    label: "Materiais Comuns",
    icon: "inventory_2",
    description: "Material de escritório, consumo, permanente",
  },
  {
    value: "GENERAL_SERVICES",
    label: "Serviços Gerais",
    icon: "engineering",
    description: "Manutenção, limpeza, segurança, consultoria",
  },
  {
    value: "ENGINEERING_WORKS",
    label: "Obras de Engenharia",
    icon: "construction",
    description: "Reformas, construções, infraestrutura",
  },
  {
    value: "HEALTH_SUPPLIES",
    label: "Insumos de Saúde",
    icon: "local_pharmacy",
    description: "Medicamentos, equipamentos médicos, EPIs",
  },
  {
    value: "OTHER",
    label: "Outros",
    icon: "category",
    description: "Demais categorias de objetos",
  },
];

const URGENCY_OPTIONS = [
  {
    value: "LOW",
    label: "Baixa",
    icon: "event",
    color: "secondary",
    description: "Pode aguardar planejamento regular",
  },
  {
    value: "MEDIUM",
    label: "Média",
    icon: "schedule",
    color: "tertiary",
    description: "Prazo razoável, sem impacto imediato",
  },
  {
    value: "HIGH",
    label: "Alta",
    icon: "priority_high",
    color: "tertiary-fixed",
    description: "Impacto nas atividades se atrasar",
  },
  {
    value: "CRITICAL",
    label: "Crítica",
    icon: "error",
    color: "error",
    description: "Paralisa atividades essenciais",
  },
];

const STEPS = [
  { title: "Objeto", icon: "package" },
  { title: "Detalhes", icon: "description" },
  { title: "Responsável", icon: "person" },
  { title: "Revisão", icon: "check_circle" },
];

const inputClasses =
  "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-2.5 font-body-md text-on-surface placeholder:text-outline transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

const inputErrorClasses =
  "border-error focus:border-error focus:ring-error/20";

const labelClasses = "mb-1.5 block font-label-md text-on-surface";

const fieldErrorClasses =
  "mt-1 flex items-center gap-1 font-label-sm text-error";

function StepIndicator({ currentStep }) {
  return (
    <nav aria-label="Etapas do formulário" className="mb-lg">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;

          return (
            <li key={step.title} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-label-md font-bold transition-colors ${
                    isCompleted
                      ? "bg-primary text-on-primary"
                      : isCurrent
                        ? "bg-primary-container text-on-primary-container ring-2 ring-primary"
                        : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {isCompleted ? (
                    <span className="material-symbols-outlined text-lg">
                      check
                    </span>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`hidden font-label-sm sm:block ${
                    isCurrent
                      ? "font-bold text-primary"
                      : "text-on-surface-variant"
                  }`}
                >
                  {step.title}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div
                  className={`mx-xs h-0.5 flex-1 rounded transition-colors ${
                    i < currentStep
                      ? "bg-primary"
                      : "bg-outline-variant"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className={fieldErrorClasses} role="alert">
      <span className="material-symbols-outlined text-sm">error</span>
      {message}
    </p>
  );
}

function StepObject({ data, onChange, errors }) {
  return (
    <div className="space-y-md">
      <div>
        <h2 className="font-headline-sm font-bold text-on-surface">
          O que você precisa?
        </h2>
        <p className="mt-1 font-body-sm text-on-surface-variant">
          Descreva o objeto da sua demanda de forma clara e objetiva.
        </p>
      </div>

      <div>
        <label htmlFor="title" className={labelClasses}>
          Título da demanda *
        </label>
        <input
          id="title"
          type="text"
          placeholder="Ex: Aquisição de computadores para atendimento ao cidadão"
          className={`${inputClasses} ${errors.title ? inputErrorClasses : ""}`}
          value={data.title}
          onChange={(e) => onChange("title", e.target.value)}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "title-error" : undefined}
        />
        <FieldError message={errors.title} />
      </div>

      <div>
        <label htmlFor="object" className={labelClasses}>
          Descrição do objeto *
        </label>
        <textarea
          id="object"
          rows={3}
          placeholder="Ex: 15 computadores desktop com processador i5, 16GB RAM, SSD 512GB para substituição de equipamentos obsoletos"
          className={`${inputClasses} resize-none ${errors.object ? inputErrorClasses : ""}`}
          value={data.object}
          onChange={(e) => onChange("object", e.target.value)}
          aria-invalid={!!errors.object}
        />
        <FieldError message={errors.object} />
      </div>

      <div>
        <label className={labelClasses}>
          Categoria do objeto *
        </label>
        {errors.category && <FieldError message={errors.category} />}
        <div className="mt-xs grid grid-cols-1 gap-xs sm:grid-cols-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => onChange("category", cat.value)}
              className={`flex items-start gap-sm rounded-lg border p-sm text-left transition-all ${
                data.category === cat.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-outline-variant bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low"
              }`}
            >
              <span
                className={`material-symbols-outlined text-xl ${
                  data.category === cat.value
                    ? "text-primary"
                    : "text-on-surface-variant"
                }`}
              >
                {cat.icon}
              </span>
              <div>
                <div
                  className={`font-label-md font-semibold ${
                    data.category === cat.value
                      ? "text-primary"
                      : "text-on-surface"
                  }`}
                >
                  {cat.label}
                </div>
                <div className="font-body-sm text-on-surface-variant">
                  {cat.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepDetails({ data, onChange, errors }) {
  return (
    <div className="space-y-md">
      <div>
        <h2 className="font-headline-sm font-bold text-on-surface">
          Detalhes da demanda
        </h2>
        <p className="mt-1 font-body-sm text-on-surface-variant">
          Justifique a necessidade e especifique os requisitos técnicos.
        </p>
      </div>

      <div>
        <label htmlFor="detailedJustification" className={labelClasses}>
          Justificativa detalhada *
        </label>
        <textarea
          id="detailedJustification"
          rows={5}
          placeholder="Ex: Os 15 computadores do setor de atendimento ao cidadão estão em uso há mais de 7 anos, apresentando lentidão significativa e falhas frequentes de hardware. A substituição é necessária para manter a qualidade do atendimento à população..."
          className={`${inputClasses} resize-none ${errors.detailedJustification ? inputErrorClasses : ""}`}
          value={data.detailedJustification}
          onChange={(e) =>
            onChange("detailedJustification", e.target.value)
          }
          aria-invalid={!!errors.detailedJustification}
        />
        <FieldError message={errors.detailedJustification} />
      </div>

      <div>
        <label htmlFor="technicalSpecifications" className={labelClasses}>
          Especificações técnicas
        </label>
        <textarea
          id="technicalSpecifications"
          rows={4}
          placeholder="Ex: Processador Intel Core i5 12ª geração ou equivalente, 16GB DDR4, SSD 512GB NVMe, monitor 23.8' Full HD, teclado e mouse USB, sistema operacional Linux"
          className={`${inputClasses} resize-none`}
          value={data.technicalSpecifications}
          onChange={(e) =>
            onChange("technicalSpecifications", e.target.value)
          }
        />
        <p className="mt-1 font-label-sm text-on-surface-variant">
          Opcional — descreva requisitos técnicos específicos do objeto.
        </p>
      </div>

      <div>
        <label className={labelClasses}>Nível de urgência *</label>
        {errors.urgency && <FieldError message={errors.urgency} />}
        <div className="mt-xs grid grid-cols-2 gap-xs sm:grid-cols-4">
          {URGENCY_OPTIONS.map((opt) => {
            const isSelected = data.urgency === opt.value;
            const colorMap = {
              secondary: {
                active: "border-secondary bg-secondary-container text-on-secondary-container",
                icon: "text-secondary",
              },
              tertiary: {
                active: "border-tertiary bg-tertiary-container text-on-tertiary-container",
                icon: "text-tertiary",
              },
              "tertiary-fixed": {
                active: "border-tertiary bg-tertiary-fixed text-on-tertiary-fixed-variant",
                icon: "text-tertiary",
              },
              error: {
                active: "border-error bg-error-container text-on-error-container",
                icon: "text-error",
              },
            };
            const colors = colorMap[opt.color];

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange("urgency", opt.value)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-sm text-center transition-all ${
                  isSelected
                    ? colors.active
                    : "border-outline-variant bg-surface-container-lowest hover:border-primary/50"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-2xl ${
                    isSelected ? "" : colors.icon
                  }`}
                >
                  {opt.icon}
                </span>
                <span className="font-label-md font-bold">
                  {opt.label}
                </span>
                <span className="font-label-sm opacity-75">
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepResponsible({ data, onChange, errors }) {
  return (
    <div className="space-y-md">
      <div>
        <h2 className="font-headline-sm font-bold text-on-surface">
          Informações administrativas
        </h2>
        <p className="mt-1 font-body-sm text-on-surface-variant">
          Dados do responsável técnico e informações orçamentárias.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
        <div>
          <label htmlFor="responsibleName" className={labelClasses}>
            Nome do responsável *
          </label>
          <input
            id="responsibleName"
            type="text"
            placeholder="Ex: Carlos Mendes"
            className={`${inputClasses} ${errors.responsibleName ? inputErrorClasses : ""}`}
            value={data.responsibleName}
            onChange={(e) => onChange("responsibleName", e.target.value)}
            aria-invalid={!!errors.responsibleName}
          />
          <FieldError message={errors.responsibleName} />
        </div>

        <div>
          <label htmlFor="responsibleEmail" className={labelClasses}>
            E-mail do responsável
          </label>
          <input
            id="responsibleEmail"
            type="email"
            placeholder="Ex: carlos.mendes@prefeitura.gov.br"
            className={`${inputClasses} ${errors.responsibleEmail ? inputErrorClasses : ""}`}
            value={data.responsibleEmail}
            onChange={(e) => onChange("responsibleEmail", e.target.value)}
            aria-invalid={!!errors.responsibleEmail}
          />
          <FieldError message={errors.responsibleEmail} />
        </div>
      </div>

      <div>
        <label htmlFor="budgetSource" className={labelClasses}>
          Dotação orçamentária
        </label>
        <input
          id="budgetSource"
          type="text"
          placeholder="Ex: Programa de Trabalho 04.122.0032.2000 - Manutenção dos Serviços Administrativos"
          className={inputClasses}
          value={data.budgetSource}
          onChange={(e) => onChange("budgetSource", e.target.value)}
        />
        <p className="mt-1 font-label-sm text-on-surface-variant">
          Opcional — informe se já conhecer a classificação orçamentária.
        </p>
      </div>

      <div>
        <label htmlFor="desiredDeadlineDays" className={labelClasses}>
          Prazo desejado (dias)
        </label>
        <input
          id="desiredDeadlineDays"
          type="number"
          min="1"
          placeholder="Ex: 30"
          className={`${inputClasses} max-w-[12rem] ${errors.desiredDeadlineDays ? inputErrorClasses : ""}`}
          value={data.desiredDeadlineDays}
          onChange={(e) =>
            onChange("desiredDeadlineDays", e.target.value)
          }
          aria-invalid={!!errors.desiredDeadlineDays}
        />
        <FieldError message={errors.desiredDeadlineDays} />
      </div>
    </div>
  );
}

function StepReview({ data }) {
  const categoryLabel =
    CATEGORIES.find((c) => c.value === data.category)?.label || data.category;
  const urgencyLabel =
    URGENCY_OPTIONS.find((u) => u.value === data.urgency)?.label ||
    data.urgency;

  const sections = [
    {
      title: "Objeto da Demanda",
      icon: "package",
      fields: [
        { label: "Título", value: data.title },
        { label: "Descrição", value: data.object },
        { label: "Categoria", value: categoryLabel },
      ],
    },
    {
      title: "Detalhes",
      icon: "description",
      fields: [
        { label: "Justificativa", value: data.detailedJustification },
        {
          label: "Especificações técnicas",
          value: data.technicalSpecifications || "Não informado",
        },
        { label: "Urgência", value: urgencyLabel },
      ],
    },
    {
      title: "Responsável e Administrativo",
      icon: "person",
      fields: [
        { label: "Responsável", value: data.responsibleName },
        {
          label: "E-mail",
          value: data.responsibleEmail || "Não informado",
        },
        {
          label: "Dotação orçamentária",
          value: data.budgetSource || "Não informada",
        },
        {
          label: "Prazo desejado",
          value: data.desiredDeadlineDays
            ? `${data.desiredDeadlineDays} dias`
            : "Não informado",
        },
      ],
    },
  ];

  return (
    <div className="space-y-md">
      <div>
        <h2 className="font-headline-sm font-bold text-on-surface">
          Revise as informações
        </h2>
        <p className="mt-1 font-body-sm text-on-surface-variant">
          Confirme os dados antes de enviar o DFD para análise.
        </p>
      </div>

      <div className="space-y-sm">
        {sections.map((section) => (
          <div
            key={section.title}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest p-sm"
          >
            <div className="mb-xs flex items-center gap-xs">
              <span className="material-symbols-outlined text-lg text-primary">
                {section.icon}
              </span>
              <h3 className="font-label-md font-bold text-on-surface">
                {section.title}
              </h3>
            </div>
            <dl className="space-y-1.5">
              {section.fields.map((field) => (
                <div
                  key={field.label}
                  className="flex flex-col gap-0.5 sm:flex-row sm:gap-sm"
                >
                  <dt className="min-w-[10rem] font-label-sm font-semibold text-on-surface-variant">
                    {field.label}
                  </dt>
                  <dd className="font-body-sm text-on-surface whitespace-pre-wrap">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DFDWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    object: "",
    category: "",
    detailedJustification: "",
    technicalSpecifications: "",
    urgency: "MEDIUM",
    responsibleName: "",
    responsibleEmail: "",
    budgetSource: "",
    desiredDeadlineDays: "",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 0) {
      if (!formData.title.trim())
        newErrors.title = "Informe o título da demanda.";
      if (!formData.object.trim())
        newErrors.object = "Descreva o objeto da demanda.";
      if (!formData.category)
        newErrors.category = "Selecione uma categoria.";
    }

    if (step === 1) {
      if (!formData.detailedJustification.trim())
        newErrors.detailedJustification =
          "Informe a justificativa da demanda.";
      if (!formData.urgency)
        newErrors.urgency = "Selecione o nível de urgência.";
    }

    if (step === 2) {
      if (!formData.responsibleName.trim())
        newErrors.responsibleName = "Informe o nome do responsável.";
      if (
        formData.responsibleEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.responsibleEmail)
      ) {
        newErrors.responsibleEmail = "Informe um e-mail válido.";
      }
      if (
        formData.desiredDeadlineDays &&
        (isNaN(formData.desiredDeadlineDays) ||
          Number(formData.desiredDeadlineDays) < 1)
      ) {
        newErrors.desiredDeadlineDays =
          "Informe um prazo válido em dias.";
      }
    }

    return newErrors;
  };

  const handleNext = () => {
    const stepErrors = validateStep(currentStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setErrors({});
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      // await fetch("/api/v1/processes", { method: "POST", body: JSON.stringify(formData) })
      console.log("DFD submitted:", formData);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSubmitted(true);
    } catch {
      setErrors({
        _general:
          "Erro ao enviar o DFD. Tente novamente em instantes.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center py-xl text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <span className="material-symbols-outlined text-4xl text-primary">
            check_circle
          </span>
        </div>
        <h2 className="mt-md font-headline-sm font-bold text-on-surface">
          DFD enviado com sucesso!
        </h2>
        <p className="mt-xs max-w-md font-body-md text-on-surface-variant">
          Seu Documento de Formalização da Demanda foi registrado e
          será analisado pelo setor de contratações. Você será
          notificado sobre o andamento.
        </p>
        <div className="mt-lg flex gap-sm">
          <a
            href="/dashboard"
            className="flex items-center gap-xs rounded-lg border border-outline-variant px-sm py-2 font-label-md text-on-surface transition-colors hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-lg">
              dashboard
            </span>
            Ir para o painel
          </a>
          <button
            type="button"
            onClick={() => {
              setIsSubmitted(false);
              setCurrentStep(0);
              setFormData({
                title: "",
                object: "",
                category: "",
                detailedJustification: "",
                technicalSpecifications: "",
                urgency: "MEDIUM",
                responsibleName: "",
                responsibleEmail: "",
                budgetSource: "",
                desiredDeadlineDays: "",
              });
            }}
            className="flex items-center gap-xs rounded-lg bg-primary px-sm py-2 font-label-md text-on-primary transition-all hover:opacity-90"
          >
            <span className="material-symbols-outlined text-lg">
              add
            </span>
            Novo DFD
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepIndicator currentStep={currentStep} />

      {errors._general && (
        <div
          className="mb-sm flex items-center gap-xs rounded-lg border border-error bg-error-container p-sm text-on-error-container"
          role="alert"
          aria-live="polite"
        >
          <span className="material-symbols-outlined text-lg">
            error
          </span>
          <span className="font-body-sm">{errors._general}</span>
        </div>
      )}

      <div className="min-h-[24rem]">
        {currentStep === 0 && (
          <StepObject
            data={formData}
            onChange={handleChange}
            errors={errors}
          />
        )}
        {currentStep === 1 && (
          <StepDetails
            data={formData}
            onChange={handleChange}
            errors={errors}
          />
        )}
        {currentStep === 2 && (
          <StepResponsible
            data={formData}
            onChange={handleChange}
            errors={errors}
          />
        )}
        {currentStep === 3 && <StepReview data={formData} />}
      </div>

      <div className="mt-lg flex items-center justify-between border-t border-outline-variant pt-md">
        {currentStep > 0 ? (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-xs rounded-lg px-sm py-2.5 font-label-md text-on-surface-variant transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-lg">
              arrow_back
            </span>
            Anterior
          </button>
        ) : (
          <div />
        )}

        {currentStep < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-2.5 font-label-md text-on-primary transition-all hover:opacity-90 active:scale-[0.99]"
          >
            Próximo
            <span className="material-symbols-outlined text-lg">
              arrow_forward
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-2.5 font-label-md text-on-primary transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">
                  progress_activity
                </span>
                Enviando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">
                  send
                </span>
                Enviar DFD
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
