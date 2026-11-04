/**
 * Demand Formalization Wizard
 *
 * In Brazilian public procurement, a Documento de Formalização da Demanda
 * (DFD) is used to formalize the organization's need for a potential
 * procurement.
 *
 * This component provides a step-by-step form for collecting the initial
 * process information and the DFD fields, persisting both atomically as a
 * DRAFT procurement process via POST /api/v1/processes.
 *
 * @see docs/DOMAIN_GLOSSARY.md
 */

import Link from "next/link";
import { useState } from "react";
import {
  formatCurrency,
  formatProcessNumber,
} from "@/components/dashboard/dashboardUtils";

export const CATEGORIES = [
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

export const URGENCY_OPTIONS = [
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

const inputErrorClasses = "border-error focus:border-error focus:ring-error/20";

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
            <li
              key={step.title}
              aria-current={isCurrent ? "step" : undefined}
              className="flex flex-1 items-center"
            >
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
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-lg"
                    >
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
                    i < currentStep ? "bg-primary" : "bg-outline-variant"
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

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className={fieldErrorClasses} role="alert">
      <span aria-hidden="true" className="material-symbols-outlined text-sm">
        error
      </span>
      {message}
    </p>
  );
}

function StepObject({
  data,
  onChange,
  onBlur,
  errors,
  user,
  departments = [],
}) {
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="space-y-md">
      <div>
        <h2 className="font-headline-sm font-bold text-on-surface">
          O que você precisa?
        </h2>
        <p className="mt-1 font-body-sm text-on-surface-variant">
          Identifique o processo e descreva o objeto da demanda de forma clara e
          objetiva.
        </p>
      </div>

      {isAdmin && departments.length > 0 ? (
        <div>
          <label htmlFor="departmentId" className={labelClasses}>
            Departamento solicitante *
          </label>
          <select
            id="departmentId"
            name="departmentId"
            className={`${inputClasses} ${errors.departmentId ? inputErrorClasses : ""}`}
            value={data.departmentId}
            onChange={(e) => onChange("departmentId", e.target.value)}
            onBlur={() => onBlur("departmentId")}
            aria-invalid={!!errors.departmentId}
            aria-describedby={
              errors.departmentId ? "departmentId-error" : undefined
            }
          >
            <option value="">Selecione um departamento...</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          <FieldError id="departmentId-error" message={errors.departmentId} />
        </div>
      ) : user?.department ? (
        <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low px-sm py-2.5">
          <span className="block font-label-sm text-on-surface-variant">
            Departamento vinculado
          </span>
          <span className="font-body-sm font-semibold text-on-surface">
            {user.department}
          </span>
        </div>
      ) : null}

      <div>
        <label htmlFor="title" className={labelClasses}>
          Título do processo / demanda *
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="Ex: Aquisição de computadores para atendimento ao cidadão"
          className={`${inputClasses} ${errors.title ? inputErrorClasses : ""}`}
          value={data.title}
          onChange={(e) => onChange("title", e.target.value)}
          onBlur={() => onBlur("title")}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "title-error" : undefined}
        />
        <FieldError id="title-error" message={errors.title} />
      </div>

      <div>
        <label htmlFor="object" className={labelClasses}>
          Descrição do objeto *
        </label>
        <textarea
          id="object"
          name="object"
          rows={3}
          required
          placeholder="Ex: 15 computadores desktop com processador i5, 16GB RAM, SSD 512GB para substituição de equipamentos obsoletos"
          className={`${inputClasses} ${errors.object ? inputErrorClasses : ""}`}
          value={data.object}
          onChange={(e) => onChange("object", e.target.value)}
          onBlur={() => onBlur("object")}
          aria-invalid={!!errors.object}
          aria-describedby={errors.object ? "object-error" : undefined}
        />
        <FieldError id="object-error" message={errors.object} />
      </div>

      <div>
        <label htmlFor="description" className={labelClasses}>
          Contexto complementar do processo
        </label>
        <p
          id="description-hint"
          className="mb-1.5 font-label-sm text-on-surface-variant"
        >
          Opcional — resumo administrativo ou observações iniciais do processo.
        </p>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Ex: Demanda prevista no Plano de Contratações Anual para modernização do parque tecnológico."
          className={inputClasses}
          value={data.description}
          onChange={(e) => onChange("description", e.target.value)}
          aria-describedby="description-hint"
        />
      </div>

      <fieldset>
        <legend className={labelClasses}>Categoria do objeto *</legend>
        {errors.category && (
          <FieldError id="category-error" message={errors.category} />
        )}
        <div className="mt-xs grid grid-cols-1 gap-xs sm:grid-cols-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              aria-pressed={data.category === cat.value}
              onClick={() => onChange("category", cat.value)}
              className={`flex items-start gap-sm rounded-lg border p-sm text-left transition-all ${
                data.category === cat.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-outline-variant bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low"
              }`}
            >
              <span
                aria-hidden="true"
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
      </fieldset>
    </div>
  );
}

function StepDetails({ data, onChange, onBlur, errors }) {
  return (
    <div className="space-y-md">
      <div>
        <h2 className="font-headline-sm font-bold text-on-surface">
          Detalhes da demanda
        </h2>
        <p className="mt-1 font-body-sm text-on-surface-variant">
          Justifique a necessidade e especifique os requisitos técnicos e
          estimativa inicial.
        </p>
      </div>

      <div>
        <label htmlFor="detailedJustification" className={labelClasses}>
          Justificativa detalhada *
        </label>
        <textarea
          id="detailedJustification"
          name="detailedJustification"
          rows={5}
          required
          placeholder="Ex: Os 15 computadores do setor de atendimento ao cidadão estão em uso há mais de 7 anos, apresentando lentidão significativa e falhas frequentes de hardware. A substituição é necessária para manter a qualidade do atendimento à população..."
          className={`${inputClasses} ${errors.detailedJustification ? inputErrorClasses : ""}`}
          value={data.detailedJustification}
          onChange={(e) => onChange("detailedJustification", e.target.value)}
          onBlur={() => onBlur("detailedJustification")}
          aria-invalid={!!errors.detailedJustification}
          aria-describedby={
            errors.detailedJustification
              ? "detailedJustification-error"
              : undefined
          }
        />
        <FieldError
          id="detailedJustification-error"
          message={errors.detailedJustification}
        />
      </div>

      <div>
        <label htmlFor="technicalSpecifications" className={labelClasses}>
          Especificações técnicas
        </label>
        <p
          id="techspecs-hint"
          className="mb-1.5 font-label-sm text-on-surface-variant"
        >
          Opcional — descreva requisitos técnicos específicos do objeto.
        </p>
        <textarea
          id="technicalSpecifications"
          name="technicalSpecifications"
          rows={4}
          placeholder="Ex: Processador Intel Core i5 12ª geração ou equivalente, 16GB DDR4, SSD 512GB NVMe, monitor 23.8' Full HD, teclado e mouse USB, sistema operacional Linux"
          className={inputClasses}
          value={data.technicalSpecifications}
          onChange={(e) => onChange("technicalSpecifications", e.target.value)}
          aria-describedby="techspecs-hint"
        />
      </div>

      <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
        <div>
          <label htmlFor="estimatedValue" className={labelClasses}>
            Valor estimado preliminar (R$)
          </label>
          <p
            id="estimatedValue-hint"
            className="mb-1.5 font-label-sm text-on-surface-variant"
          >
            Opcional no rascunho — informe se já possuir estimativa.
          </p>
          <input
            id="estimatedValue"
            name="estimatedValue"
            type="number"
            min="0"
            step="0.01"
            placeholder="Ex: 43500.00"
            className={`${inputClasses} ${errors.estimatedValue ? inputErrorClasses : ""}`}
            value={data.estimatedValue}
            onChange={(e) => onChange("estimatedValue", e.target.value)}
            onBlur={() => onBlur("estimatedValue")}
            aria-invalid={!!errors.estimatedValue}
            aria-describedby={
              errors.estimatedValue
                ? "estimatedValue-hint estimatedValue-error"
                : "estimatedValue-hint"
            }
          />
          <FieldError
            id="estimatedValue-error"
            message={errors.estimatedValue}
          />
        </div>

        <div>
          <label htmlFor="legalBasis" className={labelClasses}>
            Hipótese legal / Fundamentação
          </label>
          <p
            id="legalBasis-hint"
            className="mb-1.5 font-label-sm text-on-surface-variant"
          >
            Opcional no rascunho — ex: Art. 75, II da Lei 14.133/2021.
          </p>
          <input
            id="legalBasis"
            name="legalBasis"
            type="text"
            placeholder="Ex: Art. 75, II da Lei nº 14.133/2021"
            className={inputClasses}
            value={data.legalBasis}
            onChange={(e) => onChange("legalBasis", e.target.value)}
            aria-describedby="legalBasis-hint"
          />
        </div>
      </div>

      <fieldset>
        <legend className={labelClasses}>Nível de urgência *</legend>
        {errors.urgency && (
          <FieldError id="urgency-error" message={errors.urgency} />
        )}
        <div className="mt-xs grid grid-cols-2 gap-xs sm:grid-cols-4">
          {URGENCY_OPTIONS.map((opt) => {
            const isSelected = data.urgency === opt.value;
            const colorMap = {
              secondary: {
                active:
                  "border-secondary bg-secondary-container text-on-secondary-container",
                icon: "text-secondary",
              },
              tertiary: {
                active:
                  "border-tertiary bg-tertiary-container text-on-tertiary-container",
                icon: "text-tertiary",
              },
              "tertiary-fixed": {
                active:
                  "border-tertiary bg-tertiary-fixed text-on-tertiary-fixed-variant",
                icon: "text-tertiary",
              },
              error: {
                active:
                  "border-error bg-error-container text-on-error-container",
                icon: "text-error",
              },
            };
            const colors = colorMap[opt.color];

            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onChange("urgency", opt.value)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-sm text-center transition-all ${
                  isSelected
                    ? colors.active
                    : "border-outline-variant bg-surface-container-lowest hover:border-primary/50"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-2xl ${
                    isSelected ? "" : colors.icon
                  }`}
                >
                  {opt.icon}
                </span>
                <span className="font-label-md font-bold">{opt.label}</span>
                <span className="font-label-sm opacity-75">
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

function StepResponsible({ data, onChange, onBlur, errors }) {
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
            name="responsibleName"
            type="text"
            required
            autocomplete="name"
            placeholder="Ex: Carlos Mendes"
            className={`${inputClasses} ${errors.responsibleName ? inputErrorClasses : ""}`}
            value={data.responsibleName}
            onChange={(e) => onChange("responsibleName", e.target.value)}
            onBlur={() => onBlur("responsibleName")}
            aria-invalid={!!errors.responsibleName}
            aria-describedby={
              errors.responsibleName ? "responsibleName-error" : undefined
            }
          />
          <FieldError
            id="responsibleName-error"
            message={errors.responsibleName}
          />
        </div>

        <div>
          <label htmlFor="responsibleEmail" className={labelClasses}>
            E-mail do responsável
          </label>
          <input
            id="responsibleEmail"
            name="responsibleEmail"
            type="email"
            autocomplete="email"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="Ex: carlos.mendes@prefeitura.gov.br"
            className={`${inputClasses} ${errors.responsibleEmail ? inputErrorClasses : ""}`}
            value={data.responsibleEmail}
            onChange={(e) => onChange("responsibleEmail", e.target.value)}
            onBlur={() => onBlur("responsibleEmail")}
            aria-invalid={!!errors.responsibleEmail}
            aria-describedby={
              errors.responsibleEmail ? "responsibleEmail-error" : undefined
            }
          />
          <FieldError
            id="responsibleEmail-error"
            message={errors.responsibleEmail}
          />
        </div>
      </div>

      <div>
        <label htmlFor="budgetSource" className={labelClasses}>
          Dotação orçamentária
        </label>
        <p
          id="budgetSource-hint"
          className="mb-1.5 font-label-sm text-on-surface-variant"
        >
          Opcional — informe se já conhecer a classificação orçamentária.
        </p>
        <input
          id="budgetSource"
          name="budgetSource"
          type="text"
          placeholder="Ex: Programa de Trabalho 04.122.0032.2000 - Manutenção dos Serviços Administrativos"
          className={inputClasses}
          value={data.budgetSource}
          onChange={(e) => onChange("budgetSource", e.target.value)}
          aria-describedby="budgetSource-hint"
        />
      </div>

      <div>
        <label htmlFor="desiredDeadlineDays" className={labelClasses}>
          Prazo desejado (dias)
        </label>
        <input
          id="desiredDeadlineDays"
          name="desiredDeadlineDays"
          type="number"
          min="1"
          placeholder="Ex: 30"
          className={`${inputClasses} max-w-[12rem] ${errors.desiredDeadlineDays ? inputErrorClasses : ""}`}
          value={data.desiredDeadlineDays}
          onChange={(e) => onChange("desiredDeadlineDays", e.target.value)}
          onBlur={() => onBlur("desiredDeadlineDays")}
          aria-invalid={!!errors.desiredDeadlineDays}
          aria-describedby={
            errors.desiredDeadlineDays ? "desiredDeadlineDays-error" : undefined
          }
        />
        <FieldError
          id="desiredDeadlineDays-error"
          message={errors.desiredDeadlineDays}
        />
      </div>
    </div>
  );
}

function StepReview({ data, user, departments = [] }) {
  const categoryLabel =
    CATEGORIES.find((c) => c.value === data.category)?.label || data.category;
  const urgencyLabel =
    URGENCY_OPTIONS.find((u) => u.value === data.urgency)?.label ||
    data.urgency;

  const selectedDeptName =
    departments.find((d) => d.id === data.departmentId)?.name ||
    user?.department ||
    "Departamento vinculado ao solicitante";

  const sections = [
    {
      title: "Dados do Processo e Objeto",
      icon: "package",
      fields: [
        { label: "Departamento", value: selectedDeptName },
        { label: "Título", value: data.title },
        { label: "Objeto", value: data.object },
        {
          label: "Contexto complementar",
          value: data.description || "Não informado",
        },
        { label: "Categoria (DFD)", value: categoryLabel },
      ],
    },
    {
      title: "Detalhes e Enquadramento Preliminar",
      icon: "description",
      fields: [
        { label: "Justificativa detalhada", value: data.detailedJustification },
        {
          label: "Especificações técnicas",
          value: data.technicalSpecifications || "Não informado",
        },
        {
          label: "Valor estimado",
          value:
            data.estimatedValue !== "" && data.estimatedValue !== null
              ? formatCurrency(Number(data.estimatedValue))
              : "Não informado",
        },
        {
          label: "Fundamentação legal",
          value: data.legalBasis || "Não informada",
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
          Confirme os dados para criar o processo em modo rascunho e registrar o
          DFD.
        </p>
      </div>

      <div className="space-y-sm">
        {sections.map((section) => (
          <div
            key={section.title}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest p-sm"
          >
            <div className="mb-xs flex items-center gap-xs">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-lg text-primary"
              >
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
                  <dt className="min-w-[11rem] font-label-sm font-semibold text-on-surface-variant">
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

export default function DFDWizard({ user = null, departments = [] }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedProcess, setSubmittedProcess] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    object: "",
    description: "",
    legalBasis: "",
    estimatedValue: "",
    departmentId: user?.department_id || "",
    category: "",
    detailedJustification: "",
    technicalSpecifications: "",
    urgency: "MEDIUM",
    responsibleName: user?.name || "",
    responsibleEmail: user?.email || "",
    budgetSource: "",
    desiredDeadlineDays: "",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateField = (field, data = formData) => {
    if (field === "title" && !data.title.trim()) {
      return "Informe o título da demanda.";
    }
    if (field === "object" && !data.object.trim()) {
      return "Descreva o objeto da demanda.";
    }
    if (field === "category" && !data.category) {
      return "Selecione uma categoria.";
    }
    if (
      field === "departmentId" &&
      user?.role === "ADMIN" &&
      departments.length > 0 &&
      !data.departmentId
    ) {
      return "Selecione o departamento responsável.";
    }
    if (
      field === "detailedJustification" &&
      !data.detailedJustification.trim()
    ) {
      return "Informe a justificativa da demanda.";
    }
    if (field === "urgency" && !data.urgency) {
      return "Selecione o nível de urgência.";
    }
    if (field === "estimatedValue" && data.estimatedValue !== "") {
      const val = Number(data.estimatedValue);
      if (Number.isNaN(val) || val < 0) {
        return "Informe um valor estimado válido (maior ou igual a zero).";
      }
    }
    if (field === "responsibleName" && !data.responsibleName.trim()) {
      return "Informe o nome do responsável.";
    }
    if (
      field === "responsibleEmail" &&
      data.responsibleEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.responsibleEmail.trim())
    ) {
      return "Informe um e-mail válido.";
    }
    if (
      field === "desiredDeadlineDays" &&
      data.desiredDeadlineDays !== "" &&
      (Number.isNaN(Number(data.desiredDeadlineDays)) ||
        !Number.isInteger(Number(data.desiredDeadlineDays)) ||
        Number(data.desiredDeadlineDays) < 1)
    ) {
      return "Informe um prazo inteiro válido em dias.";
    }
    return undefined;
  };

  const handleBlur = (field) => {
    const fieldError = validateField(field);
    if (fieldError) {
      setErrors((prev) => ({ ...prev, [field]: fieldError }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 0) {
      const titleErr = validateField("title");
      if (titleErr) newErrors.title = titleErr;
      const objectErr = validateField("object");
      if (objectErr) newErrors.object = objectErr;
      const catErr = validateField("category");
      if (catErr) newErrors.category = catErr;
      const deptErr = validateField("departmentId");
      if (deptErr) newErrors.departmentId = deptErr;
    }

    if (step === 1) {
      const justErr = validateField("detailedJustification");
      if (justErr) newErrors.detailedJustification = justErr;
      const urgErr = validateField("urgency");
      if (urgErr) newErrors.urgency = urgErr;
      const valErr = validateField("estimatedValue");
      if (valErr) newErrors.estimatedValue = valErr;
    }

    if (step === 2) {
      const nameErr = validateField("responsibleName");
      if (nameErr) newErrors.responsibleName = nameErr;
      const emailErr = validateField("responsibleEmail");
      if (emailErr) newErrors.responsibleEmail = emailErr;
      const deadlineErr = validateField("desiredDeadlineDays");
      if (deadlineErr) newErrors.desiredDeadlineDays = deadlineErr;
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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (currentStep < STEPS.length - 1) {
      handleNext();
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        title: formData.title.trim(),
        object: formData.object.trim(),
        category: formData.category,
        detailedJustification: formData.detailedJustification.trim(),
        urgency: formData.urgency,
        responsibleName: formData.responsibleName.trim(),
      };

      if (formData.description.trim()) {
        payload.description = formData.description.trim();
      }

      if (formData.legalBasis.trim()) {
        payload.legalBasis = formData.legalBasis.trim();
      }

      if (
        formData.estimatedValue !== "" &&
        formData.estimatedValue !== null &&
        formData.estimatedValue !== undefined
      ) {
        payload.estimatedValue = Number(formData.estimatedValue);
      }

      if (formData.departmentId && formData.departmentId.trim()) {
        payload.departmentId = formData.departmentId.trim();
      }

      if (formData.technicalSpecifications.trim()) {
        payload.technicalSpecifications =
          formData.technicalSpecifications.trim();
      }

      if (formData.responsibleEmail.trim()) {
        payload.responsibleEmail = formData.responsibleEmail.trim();
      }

      if (formData.budgetSource.trim()) {
        payload.budgetSource = formData.budgetSource.trim();
      }

      if (
        formData.desiredDeadlineDays !== "" &&
        formData.desiredDeadlineDays !== null &&
        formData.desiredDeadlineDays !== undefined
      ) {
        payload.desiredDeadlineDays = Number(formData.desiredDeadlineDays);
      }

      const response = await fetch("/api/v1/processes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.message || "Erro ao registrar o processo.",
        );
      }

      setSubmittedProcess(responseData);
    } catch (err) {
      setErrors({
        _general:
          err.message ||
          "Erro ao registrar o processo e DFD. Tente novamente em instantes.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedProcess) {
    const formattedNumber = formatProcessNumber(
      submittedProcess.number,
      submittedProcess.year,
    );

    return (
      <div className="flex flex-col items-center py-xl text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-4xl text-primary"
          >
            check_circle
          </span>
        </div>
        <h2 className="mt-md font-headline-sm font-bold text-on-surface">
          Processo e DFD salvos em rascunho!
        </h2>
        <p className="mt-xs max-w-md font-body-md text-on-surface-variant">
          O processo{" "}
          <strong className="text-on-surface">{formattedNumber}</strong> foi
          criado com status{" "}
          <strong className="text-on-surface">Rascunho</strong> e associado ao
          seu Documento de Formalização da Demanda (DFD).
        </p>
        <div className="mt-lg flex flex-wrap items-center justify-center gap-sm">
          <Link
            href={`/processes/${submittedProcess.id}`}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-2.5 font-label-md text-on-primary transition-all hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-lg"
            >
              visibility
            </span>
            Abrir Processo
          </Link>

          <Link
            href="/processes"
            className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-2.5 font-label-md text-on-surface transition-colors hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-lg"
            >
              format_list_bulleted
            </span>
            Lista de Processos
          </Link>

          <button
            type="button"
            onClick={() => {
              setSubmittedProcess(null);
              setCurrentStep(0);
              setFormData({
                title: "",
                object: "",
                description: "",
                legalBasis: "",
                estimatedValue: "",
                departmentId: user?.department_id || "",
                category: "",
                detailedJustification: "",
                technicalSpecifications: "",
                urgency: "MEDIUM",
                responsibleName: user?.name || "",
                responsibleEmail: user?.email || "",
                budgetSource: "",
                desiredDeadlineDays: "",
              });
            }}
            className="flex items-center gap-xs rounded-lg border border-outline-variant px-sm py-2.5 font-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-lg"
            >
              add
            </span>
            Novo Processo
          </button>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <StepIndicator currentStep={currentStep} />

      {errors._general && (
        <div
          className="mb-sm flex items-center gap-xs rounded-lg border border-error bg-error-container p-sm text-on-error-container"
          role="alert"
          aria-live="polite"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-lg"
          >
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
            onBlur={handleBlur}
            errors={errors}
            user={user}
            departments={departments}
          />
        )}
        {currentStep === 1 && (
          <StepDetails
            data={formData}
            onChange={handleChange}
            onBlur={handleBlur}
            errors={errors}
          />
        )}
        {currentStep === 2 && (
          <StepResponsible
            data={formData}
            onChange={handleChange}
            onBlur={handleBlur}
            errors={errors}
          />
        )}
        {currentStep === 3 && (
          <StepReview data={formData} user={user} departments={departments} />
        )}
      </div>

      <div className="mt-lg flex items-center justify-between border-t border-outline-variant pt-md">
        {currentStep > 0 ? (
          <button
            type="button"
            onClick={handleBack}
            enterKeyHint="previous"
            className="flex items-center gap-xs rounded-lg px-sm py-2.5 font-label-md text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-lg"
            >
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
            enterKeyHint="next"
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-2.5 font-label-md text-on-primary transition-all hover:opacity-90 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Próximo
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-lg"
            >
              arrow_forward
            </span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-2.5 font-label-md text-on-primary transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {isSubmitting ? (
              <>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined animate-spin text-lg"
                >
                  progress_activity
                </span>
                Salvando rascunho...
              </>
            ) : (
              <>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-lg"
                >
                  save
                </span>
                Salvar Rascunho e DFD
              </>
            )}
          </button>
        )}
      </div>
    </form>
  );
}
