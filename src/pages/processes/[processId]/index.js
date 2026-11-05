import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProcessStatusBadge from "@/components/dashboard/ProcessStatusBadge";
import {
  AUDIT_ACTION_LABELS,
  CATEGORY_LABELS,
  ROLE_LABELS,
  URGENCY_BADGE_STYLES,
  URGENCY_LABELS,
  formatCurrency,
  formatDateTime,
  formatProcessNumber,
} from "@/components/dashboard/dashboardUtils";
import {
  CATEGORIES,
  URGENCY_OPTIONS,
} from "@/components/demand-formalization/DemandFormalizationWizard.jsx";
import ApprovalWorkflowTab from "@/components/procurement/ApprovalWorkflowTab";
import DocumentManagementTab from "@/components/procurement/DocumentManagementTab";
import JustificationsTab from "@/components/procurement/JustificationsTab";
import LegalClassificationTab from "@/components/procurement/LegalClassificationTab";
import PriceResearchTab from "@/components/procurement/PriceResearchTab";
import ProcessReviewTab from "@/components/procurement/ProcessReviewTab";
import SupplierManagementTab from "@/components/procurement/SupplierManagementTab";

export async function getServerSideProps(context) {
  const { req, params } = context;
  const cookieHeader = req.headers.cookie ?? "";
  const processId = params?.processId;

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

    const processResponse = await fetch(
      `${protocol}://${host}/api/v1/processes/${encodeURIComponent(processId)}`,
      {
        headers: {
          cookie: cookieHeader,
        },
      },
    );

    if (!processResponse.ok) {
      const errorPayload = await processResponse.json().catch(() => ({}));
      return {
        props: {
          user,
          initialProcess: null,
          initialError: {
            statusCode: processResponse.status,
            message:
              errorPayload.message ||
              (processResponse.status === 403
                ? "Você não tem permissão para visualizar este processo."
                : "Processo não encontrado."),
          },
        },
      };
    }

    const initialProcess = await processResponse.json();

    let initialSuppliers = [];
    try {
      const suppliersRes = await fetch(
        `${protocol}://${host}/api/v1/suppliers?limit=100`,
        {
          headers: {
            cookie: cookieHeader,
          },
        },
      );
      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json();
        initialSuppliers = suppliersData.data || [];
      }
    } catch {
      // Ignored fallback
    }

    let initialWorkflow = null;
    try {
      const workflowRes = await fetch(
        `${protocol}://${host}/api/v1/processes/${encodeURIComponent(processId)}/workflow`,
        {
          headers: {
            cookie: cookieHeader,
          },
        },
      );
      if (workflowRes.ok) {
        initialWorkflow = await workflowRes.json();
      }
    } catch {
      // Ignored fallback
    }

    return {
      props: {
        user,
        initialProcess,
        initialSuppliers,
        initialWorkflow,
        initialError: null,
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

const WORKFLOW_STEPS = [
  { key: "DRAFT", label: "Rascunho", icon: "edit_document" },
  { key: "IN_ANALYSIS", label: "Análise Técnica", icon: "manage_search" },
  {
    key: "AWAITING_APPROVAL",
    label: "Aprovação Interna",
    icon: "hourglass_top",
  },
  { key: "APPROVED", label: "Aprovado", icon: "fact_check" },
  { key: "COMPLETED", label: "Concluído", icon: "task_alt" },
];

const MODULE_TABS = [
  {
    id: "overview",
    label: "Visão Geral e DFD",
    icon: "description",
  },
  {
    id: "legal",
    label: "Enquadramento Legal",
    icon: "gavel",
  },
  {
    id: "documents",
    label: "Documentos",
    icon: "folder_open",
  },
  {
    id: "quotations",
    label: "Pesquisa de Preços",
    icon: "request_quote",
  },
  {
    id: "supplier",
    label: "Fornecedores",
    icon: "storefront",
  },
  {
    id: "justifications",
    label: "Justificativas & Escolha",
    icon: "verified_user",
  },
  {
    id: "review",
    label: "Resumo & Submissão",
    icon: "send",
  },
  {
    id: "approvals",
    label: "Análise & Decisão",
    icon: "fact_check",
  },
  {
    id: "history",
    label: "Histórico / Auditoria",
    icon: "history",
  },
];

const inputClasses =
  "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-2.5 font-body-sm text-on-surface placeholder:text-outline transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

const inputErrorClasses = "border-error focus:border-error focus:ring-error/20";
const labelClasses = "mb-1 block font-label-md text-on-surface";

function WorkflowStepper({ currentStatus }) {
  const isRejected = currentStatus === "REJECTED";
  const isReturned = currentStatus === "RETURNED_FOR_ADJUSTMENT";
  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-md">
      <div className="mb-sm flex items-center justify-between">
        <h2 className="font-label-md font-bold uppercase tracking-wider text-on-surface-variant">
          Progresso da Tramitação
        </h2>
        {isRejected && (
          <span className="rounded-full bg-error-container px-2.5 py-0.5 font-label-sm text-on-error-container">
            Processo Rejeitado na Etapa de Aprovação
          </span>
        )}
        {isReturned && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-label-sm font-bold text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200">
            Devolvido para Ajustes do Solicitante
          </span>
        )}
      </div>

      <ol
        aria-label="Etapas do fluxo do processo"
        className="grid grid-cols-2 gap-xs sm:grid-cols-5"
      >
        {WORKFLOW_STEPS.map((step, index) => {
          const isCompleted =
            !isRejected && !isReturned && currentIndex > index;
          const isActive = !isRejected && !isReturned && currentIndex === index;

          return (
            <li
              key={step.key}
              aria-current={isActive ? "step" : undefined}
              className={`flex items-center gap-xs rounded-md border p-2 text-xs transition-colors ${
                isActive
                  ? "border-primary bg-primary/10 font-bold text-primary"
                  : isCompleted
                    ? "border-primary/30 bg-surface-container-low text-on-surface"
                    : "border-outline-variant/40 bg-surface-container-lowest text-outline"
              }`}
            >
              <span
                aria-hidden="true"
                className={`material-symbols-outlined text-base ${
                  isActive || isCompleted ? "text-primary" : "text-outline"
                }`}
              >
                {isCompleted ? "check_circle" : step.icon}
              </span>
              <span className="truncate">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function ProcessDetailPage({
  user,
  initialProcess,
  initialSuppliers = [],
  initialWorkflow = null,
  initialError,
}) {
  const router = useRouter();
  const [processData, setProcessData] = useState(initialProcess);
  const [suppliers, setSuppliers] = useState(initialSuppliers || []);
  const [workflowState, setWorkflowState] = useState(initialWorkflow);
  const [tabOverride, setTabOverride] = useState(null);
  const activeTab =
    tabOverride ||
    (typeof router.query.tab === "string" ? router.query.tab : "overview");
  const setActiveTab = (tab) => setTabOverride(tab);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [feedbackBanner, setFeedbackBanner] = useState(null);

  const refreshProcessData = async () => {
    if (!processData?.id) return;
    try {
      const [pRes, wRes] = await Promise.all([
        fetch(`/api/v1/processes/${processData.id}`),
        fetch(`/api/v1/processes/${processData.id}/workflow`),
      ]);
      if (pRes.ok) {
        const data = await pRes.json();
        setProcessData(data);
      }
      if (wRes.ok) {
        const wData = await wRes.json();
        setWorkflowState(wData);
      }
    } catch {
      // Ignored
    }
  };

  const handleDocumentUploaded = (newDoc) => {
    setProcessData((prev) => ({
      ...prev,
      documents: [newDoc, ...(prev?.documents || [])],
    }));
    refreshProcessData();
  };

  const handleDocumentDeleted = (docId) => {
    setProcessData((prev) => ({
      ...prev,
      documents: (prev?.documents || []).filter((d) => d.id !== docId),
    }));
    refreshProcessData();
  };

  const handleQuotationCreated = () => {
    refreshProcessData();
  };

  const handleQuotationUpdated = () => {
    refreshProcessData();
  };

  const handleQuotationDeleted = () => {
    refreshProcessData();
  };

  const handleSupplierSaved = (savedSupplier, isEdit) => {
    setSuppliers((prev) => {
      if (isEdit) {
        return prev.map((s) => (s.id === savedSupplier.id ? savedSupplier : s));
      }
      return [savedSupplier, ...prev];
    });
  };

  const [editForm, setEditForm] = useState(() =>
    buildEditFormState(initialProcess),
  );

  function buildEditFormState(proc) {
    if (!proc) return {};
    const dfd = proc.demandDocument || {};
    return {
      title: proc.title || "",
      object: proc.object || "",
      description: proc.description || "",
      legalBasis: proc.legalBasis || "",
      estimatedValue:
        proc.estimatedValue !== null && proc.estimatedValue !== undefined
          ? String(proc.estimatedValue)
          : "",
      category: dfd.category || "OTHER",
      urgency: dfd.urgency || "MEDIUM",
      detailedJustification: dfd.detailedJustification || "",
      technicalSpecifications: dfd.technicalSpecifications || "",
      responsibleName: dfd.responsibleName || "",
      responsibleEmail: dfd.responsibleEmail || "",
      budgetSource: dfd.budgetSource || "",
      desiredDeadlineDays:
        dfd.desiredDeadlineDays !== null &&
        dfd.desiredDeadlineDays !== undefined
          ? String(dfd.desiredDeadlineDays)
          : "",
    };
  }

  if (initialError || !processData) {
    return (
      <>
        <Head>
          <title>Processo — SISD</title>
        </Head>
        <DashboardLayout user={user}>
          <div className="mx-auto max-w-2xl rounded-xl border border-outline-variant bg-surface-container-lowest p-lg text-center">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-4xl text-error"
            >
              {initialError?.statusCode === 403 ? "lock" : "search_off"}
            </span>
            <h1 className="mt-sm font-headline-md font-bold text-on-surface">
              {initialError?.statusCode === 403
                ? "Acesso negado ao processo"
                : "Processo não encontrado"}
            </h1>
            <p className="mt-xs font-body-md text-on-surface-variant">
              {initialError?.message ||
                "Não foi possível localizar o processo solicitado."}
            </p>
            <div className="mt-lg flex justify-center gap-sm">
              <Link
                href="/processes"
                className="inline-flex items-center gap-xs rounded-lg bg-primary px-md py-2 font-label-md text-on-primary hover:bg-primary-container"
              >
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-lg"
                >
                  arrow_back
                </span>
                Voltar para Lista de Processos
              </Link>
            </div>
          </div>
        </DashboardLayout>
      </>
    );
  }

  const formattedNumber = formatProcessNumber(
    processData.number,
    processData.year,
  );
  const canEdit = Boolean(processData.permissions?.canEdit);
  const dfd = processData.demandDocument;

  const handleOpenEdit = () => {
    setEditForm(buildEditFormState(processData));
    setEditErrors({});
    setFeedbackBanner(null);
    setIsEditing(true);
    setActiveTab("overview");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditErrors({});
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateEditField = (field, data = editForm) => {
    if (field === "title" && !data.title?.trim()) {
      return "O título do processo é obrigatório.";
    }
    if (field === "object" && !data.object?.trim()) {
      return "A descrição do objeto é obrigatória.";
    }
    if (
      field === "detailedJustification" &&
      !data.detailedJustification?.trim()
    ) {
      return "A justificativa detalhada do DFD é obrigatória.";
    }
    if (field === "responsibleName" && !data.responsibleName?.trim()) {
      return "O nome do responsável pelo DFD é obrigatório.";
    }
    if (
      field === "responsibleEmail" &&
      data.responsibleEmail?.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.responsibleEmail.trim())
    ) {
      return "Informe um endereço de e-mail válido.";
    }
    if (field === "estimatedValue" && data.estimatedValue !== "") {
      const num = Number(data.estimatedValue);
      if (Number.isNaN(num) || num < 0) {
        return "Informe um valor estimado maior ou igual a zero.";
      }
    }
    if (
      field === "desiredDeadlineDays" &&
      data.desiredDeadlineDays !== "" &&
      (!Number.isInteger(Number(data.desiredDeadlineDays)) ||
        Number(data.desiredDeadlineDays) <= 0)
    ) {
      return "Informe um número inteiro positivo de dias.";
    }
    return undefined;
  };

  const handleEditFieldBlur = (field) => {
    const err = validateEditField(field);
    if (err) {
      setEditErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    const validationErrors = {};
    for (const f of [
      "title",
      "object",
      "detailedJustification",
      "responsibleName",
      "responsibleEmail",
      "estimatedValue",
      "desiredDeadlineDays",
    ]) {
      const err = validateEditField(f);
      if (err) validationErrors[f] = err;
    }

    if (Object.keys(validationErrors).length > 0) {
      setEditErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    setEditErrors({});
    setFeedbackBanner(null);

    try {
      const payload = {
        title: editForm.title.trim(),
        object: editForm.object.trim(),
        description: editForm.description.trim() || null,
        legalBasis: editForm.legalBasis.trim() || null,
        estimatedValue:
          editForm.estimatedValue === ""
            ? null
            : Number(editForm.estimatedValue),
        demandDocument: {
          category: editForm.category,
          urgency: editForm.urgency,
          detailedJustification: editForm.detailedJustification.trim(),
          technicalSpecifications:
            editForm.technicalSpecifications.trim() || null,
          responsibleName: editForm.responsibleName.trim(),
          responsibleEmail: editForm.responsibleEmail.trim() || null,
          budgetSource: editForm.budgetSource.trim() || null,
          desiredDeadlineDays:
            editForm.desiredDeadlineDays === ""
              ? null
              : Number(editForm.desiredDeadlineDays),
        },
      };

      const response = await fetch(`/api/v1/processes/${processData.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const updatedData = await response.json();

      if (!response.ok) {
        throw new Error(
          updatedData.message || "Erro ao salvar alterações do processo.",
        );
      }

      setProcessData(updatedData);
      setIsEditing(false);
      setFeedbackBanner({
        type: "success",
        message: "Alterações do processo e DFD salvas com sucesso.",
      });
    } catch (err) {
      setEditErrors({
        _general: err.message || "Não foi possível atualizar o processo.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>{`Processo ${formattedNumber} — SISD`}</title>
        <meta
          name="description"
          content={`Detalhes e acompanhamento do processo ${formattedNumber} - ${processData.title}`}
        />
      </Head>

      <DashboardLayout user={user}>
        <div className="space-y-lg">
          {/* Breadcrumbs */}
          <nav
            aria-label="Navegação estrutural (Breadcrumb)"
            className="flex items-center gap-xs font-label-sm text-on-surface-variant"
          >
            <Link
              href="/dashboard"
              className="hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Painel
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/processes"
              className="hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Processos
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="font-semibold text-on-surface">
              {formattedNumber}
            </span>
          </nav>

          {/* Feedback Banner */}
          {feedbackBanner && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-between gap-sm rounded-lg border border-primary/30 bg-primary-fixed/40 p-md text-on-primary-fixed-variant"
            >
              <div className="flex items-center gap-xs">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-xl text-primary"
                >
                  check_circle
                </span>
                <span className="font-label-md font-semibold">
                  {feedbackBanner.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackBanner(null)}
                aria-label="Fechar aviso"
                className="rounded p-1 text-on-primary-fixed-variant hover:bg-primary/10"
              >
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-base"
                >
                  close
                </span>
              </button>
            </div>
          )}

          {/* Process Header Card */}
          <div className="rounded-xl border border-outline-variant/80 bg-surface-container-lowest p-md sm:p-lg">
            <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-xs">
                <div className="flex flex-wrap items-center gap-xs">
                  <span className="rounded-md bg-primary/10 px-2.5 py-1 font-label-md font-bold text-primary">
                    Processo #{formattedNumber}
                  </span>
                  <ProcessStatusBadge status={processData.status} />
                  {dfd?.urgency && (
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        URGENCY_BADGE_STYLES[dfd.urgency] ||
                        URGENCY_BADGE_STYLES.MEDIUM
                      }`}
                    >
                      Urgência: {URGENCY_LABELS[dfd.urgency] || dfd.urgency}
                    </span>
                  )}
                </div>

                <h1 className="font-headline-lg font-bold text-on-surface">
                  {processData.title}
                </h1>

                <div className="flex flex-wrap items-center gap-x-md gap-y-1 pt-1 font-body-sm text-on-surface-variant">
                  <span className="inline-flex items-center gap-1">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-base text-primary"
                    >
                      apartment
                    </span>
                    <strong>Departamento:</strong>{" "}
                    {processData.department?.name || "Não informado"}
                  </span>

                  <span className="inline-flex items-center gap-1">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-base text-primary"
                    >
                      person
                    </span>
                    <strong>Solicitante:</strong>{" "}
                    {processData.requester?.name || "—"}
                  </span>

                  <span className="inline-flex items-center gap-1">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-base text-primary"
                    >
                      payments
                    </span>
                    <strong>Valor Estimado:</strong>{" "}
                    {formatCurrency(processData.estimatedValue)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-xs self-start">
                <Link
                  href="/processes"
                  className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-2 font-label-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-lg"
                  >
                    arrow_back
                  </span>
                  <span>Processos</span>
                </Link>

                {canEdit && !isEditing && (
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-md py-2 font-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-lg"
                    >
                      edit
                    </span>
                    <span>Editar Processo / DFD</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Workflow Progress Stepper */}
          <WorkflowStepper currentStatus={processData.status} />

          {/* Module Navigation Tabs */}
          <div className="border-b border-outline-variant">
            <div
              role="tablist"
              aria-label="Módulos do processo"
              className="flex overflow-x-auto gap-1"
            >
              {MODULE_TABS.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={isSelected}
                    aria-controls={`tabpanel-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-md py-sm font-label-md transition-colors ${
                      isSelected
                        ? "border-primary font-bold text-primary"
                        : "border-transparent text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
                    } focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary`}
                  >
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-lg"
                    >
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                    {tab.phaseBadge && (
                      <span className="rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                        {tab.phaseBadge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Panel: Overview & DFD */}
          {activeTab === "overview" && (
            <div
              id="tabpanel-overview"
              role="tabpanel"
              aria-labelledby="tab-overview"
              className="space-y-lg"
            >
              {isEditing ? (
                <form
                  noValidate
                  onSubmit={handleSaveEdit}
                  className="rounded-xl border border-primary/40 bg-surface-container-lowest p-md sm:p-lg space-y-lg"
                >
                  <div className="flex items-center justify-between border-b border-outline-variant/60 pb-sm">
                    <div>
                      <h2 className="font-headline-sm font-bold text-on-surface">
                        Editar Rascunho do Processo e DFD
                      </h2>
                      <p className="font-body-sm text-xs text-on-surface-variant">
                        Processos em status Rascunho podem ter seus dados gerais
                        e o DFD atualizados.
                      </p>
                    </div>
                  </div>

                  {editErrors._general && (
                    <div
                      role="alert"
                      className="flex items-center gap-xs rounded-lg border border-error bg-error-container p-sm text-on-error-container"
                    >
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-lg"
                      >
                        error
                      </span>
                      <span className="font-body-sm">
                        {editErrors._general}
                      </span>
                    </div>
                  )}

                  {/* Section 1: Process fields */}
                  <fieldset className="space-y-sm">
                    <legend className="font-label-md font-bold uppercase tracking-wider text-primary">
                      1. Dados Gerais do Processo
                    </legend>

                    <div>
                      <label htmlFor="edit-title" className={labelClasses}>
                        Título do processo *
                      </label>
                      <input
                        id="edit-title"
                        name="title"
                        type="text"
                        required
                        className={`${inputClasses} ${editErrors.title ? inputErrorClasses : ""}`}
                        value={editForm.title}
                        onChange={(e) =>
                          handleEditFieldChange("title", e.target.value)
                        }
                        onBlur={() => handleEditFieldBlur("title")}
                        aria-invalid={!!editErrors.title}
                        aria-describedby={
                          editErrors.title ? "edit-title-error" : undefined
                        }
                      />
                      {editErrors.title && (
                        <p
                          id="edit-title-error"
                          role="alert"
                          className="mt-1 font-label-sm text-error"
                        >
                          {editErrors.title}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="edit-object" className={labelClasses}>
                        Objeto da contratação *
                      </label>
                      <textarea
                        id="edit-object"
                        name="object"
                        rows={3}
                        required
                        className={`${inputClasses} ${editErrors.object ? inputErrorClasses : ""}`}
                        value={editForm.object}
                        onChange={(e) =>
                          handleEditFieldChange("object", e.target.value)
                        }
                        onBlur={() => handleEditFieldBlur("object")}
                        aria-invalid={!!editErrors.object}
                        aria-describedby={
                          editErrors.object ? "edit-object-error" : undefined
                        }
                      />
                      {editErrors.object && (
                        <p
                          id="edit-object-error"
                          role="alert"
                          className="mt-1 font-label-sm text-error"
                        >
                          {editErrors.object}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="edit-description"
                        className={labelClasses}
                      >
                        Descrição complementar
                      </label>
                      <textarea
                        id="edit-description"
                        name="description"
                        rows={2}
                        className={inputClasses}
                        value={editForm.description}
                        onChange={(e) =>
                          handleEditFieldChange("description", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="edit-estimatedValue"
                          className={labelClasses}
                        >
                          Valor estimado (R$)
                        </label>
                        <input
                          id="edit-estimatedValue"
                          name="estimatedValue"
                          type="number"
                          min="0"
                          step="0.01"
                          className={`${inputClasses} ${editErrors.estimatedValue ? inputErrorClasses : ""}`}
                          value={editForm.estimatedValue}
                          onChange={(e) =>
                            handleEditFieldChange(
                              "estimatedValue",
                              e.target.value,
                            )
                          }
                          onBlur={() => handleEditFieldBlur("estimatedValue")}
                          aria-invalid={!!editErrors.estimatedValue}
                          aria-describedby={
                            editErrors.estimatedValue
                              ? "edit-estimatedValue-error"
                              : undefined
                          }
                        />
                        {editErrors.estimatedValue && (
                          <p
                            id="edit-estimatedValue-error"
                            role="alert"
                            className="mt-1 font-label-sm text-error"
                          >
                            {editErrors.estimatedValue}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="edit-legalBasis"
                          className={labelClasses}
                        >
                          Fundamentação / Hipótese legal
                        </label>
                        <input
                          id="edit-legalBasis"
                          name="legalBasis"
                          type="text"
                          placeholder="Ex: Art. 75, II da Lei nº 14.133/2021"
                          className={inputClasses}
                          value={editForm.legalBasis}
                          onChange={(e) =>
                            handleEditFieldChange("legalBasis", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </fieldset>

                  {/* Section 2: DFD fields */}
                  <fieldset className="space-y-sm border-t border-outline-variant/60 pt-md">
                    <legend className="font-label-md font-bold uppercase tracking-wider text-primary">
                      2. Documento de Formalização da Demanda (DFD)
                    </legend>

                    <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
                      <div>
                        <label htmlFor="edit-category" className={labelClasses}>
                          Categoria do objeto *
                        </label>
                        <select
                          id="edit-category"
                          name="category"
                          className={inputClasses}
                          value={editForm.category}
                          onChange={(e) =>
                            handleEditFieldChange("category", e.target.value)
                          }
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="edit-urgency" className={labelClasses}>
                          Nível de urgência *
                        </label>
                        <select
                          id="edit-urgency"
                          name="urgency"
                          className={inputClasses}
                          value={editForm.urgency}
                          onChange={(e) =>
                            handleEditFieldChange("urgency", e.target.value)
                          }
                        >
                          {URGENCY_OPTIONS.map((urg) => (
                            <option key={urg.value} value={urg.value}>
                              {urg.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="edit-detailedJustification"
                        className={labelClasses}
                      >
                        Justificativa detalhada da contratação *
                      </label>
                      <textarea
                        id="edit-detailedJustification"
                        name="detailedJustification"
                        rows={4}
                        required
                        className={`${inputClasses} ${editErrors.detailedJustification ? inputErrorClasses : ""}`}
                        value={editForm.detailedJustification}
                        onChange={(e) =>
                          handleEditFieldChange(
                            "detailedJustification",
                            e.target.value,
                          )
                        }
                        onBlur={() =>
                          handleEditFieldBlur("detailedJustification")
                        }
                        aria-invalid={!!editErrors.detailedJustification}
                        aria-describedby={
                          editErrors.detailedJustification
                            ? "edit-detailedJustification-error"
                            : undefined
                        }
                      />
                      {editErrors.detailedJustification && (
                        <p
                          id="edit-detailedJustification-error"
                          role="alert"
                          className="mt-1 font-label-sm text-error"
                        >
                          {editErrors.detailedJustification}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="edit-technicalSpecifications"
                        className={labelClasses}
                      >
                        Especificações técnicas
                      </label>
                      <textarea
                        id="edit-technicalSpecifications"
                        name="technicalSpecifications"
                        rows={3}
                        className={inputClasses}
                        value={editForm.technicalSpecifications}
                        onChange={(e) =>
                          handleEditFieldChange(
                            "technicalSpecifications",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="edit-responsibleName"
                          className={labelClasses}
                        >
                          Nome do responsável *
                        </label>
                        <input
                          id="edit-responsibleName"
                          name="responsibleName"
                          type="text"
                          required
                          className={`${inputClasses} ${editErrors.responsibleName ? inputErrorClasses : ""}`}
                          value={editForm.responsibleName}
                          onChange={(e) =>
                            handleEditFieldChange(
                              "responsibleName",
                              e.target.value,
                            )
                          }
                          onBlur={() => handleEditFieldBlur("responsibleName")}
                          aria-invalid={!!editErrors.responsibleName}
                          aria-describedby={
                            editErrors.responsibleName
                              ? "edit-responsibleName-error"
                              : undefined
                          }
                        />
                        {editErrors.responsibleName && (
                          <p
                            id="edit-responsibleName-error"
                            role="alert"
                            className="mt-1 font-label-sm text-error"
                          >
                            {editErrors.responsibleName}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="edit-responsibleEmail"
                          className={labelClasses}
                        >
                          E-mail do responsável
                        </label>
                        <input
                          id="edit-responsibleEmail"
                          name="responsibleEmail"
                          type="email"
                          autocorrect="off"
                          autocapitalize="off"
                          spellcheck="false"
                          className={`${inputClasses} ${editErrors.responsibleEmail ? inputErrorClasses : ""}`}
                          value={editForm.responsibleEmail}
                          onChange={(e) =>
                            handleEditFieldChange(
                              "responsibleEmail",
                              e.target.value,
                            )
                          }
                          onBlur={() => handleEditFieldBlur("responsibleEmail")}
                          aria-invalid={!!editErrors.responsibleEmail}
                          aria-describedby={
                            editErrors.responsibleEmail
                              ? "edit-responsibleEmail-error"
                              : undefined
                          }
                        />
                        {editErrors.responsibleEmail && (
                          <p
                            id="edit-responsibleEmail-error"
                            role="alert"
                            className="mt-1 font-label-sm text-error"
                          >
                            {editErrors.responsibleEmail}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="edit-budgetSource"
                          className={labelClasses}
                        >
                          Dotação orçamentária
                        </label>
                        <input
                          id="edit-budgetSource"
                          name="budgetSource"
                          type="text"
                          className={inputClasses}
                          value={editForm.budgetSource}
                          onChange={(e) =>
                            handleEditFieldChange(
                              "budgetSource",
                              e.target.value,
                            )
                          }
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="edit-desiredDeadlineDays"
                          className={labelClasses}
                        >
                          Prazo desejado (dias)
                        </label>
                        <input
                          id="edit-desiredDeadlineDays"
                          name="desiredDeadlineDays"
                          type="number"
                          min="1"
                          className={`${inputClasses} ${editErrors.desiredDeadlineDays ? inputErrorClasses : ""}`}
                          value={editForm.desiredDeadlineDays}
                          onChange={(e) =>
                            handleEditFieldChange(
                              "desiredDeadlineDays",
                              e.target.value,
                            )
                          }
                          onBlur={() =>
                            handleEditFieldBlur("desiredDeadlineDays")
                          }
                          aria-invalid={!!editErrors.desiredDeadlineDays}
                          aria-describedby={
                            editErrors.desiredDeadlineDays
                              ? "edit-desiredDeadlineDays-error"
                              : undefined
                          }
                        />
                        {editErrors.desiredDeadlineDays && (
                          <p
                            id="edit-desiredDeadlineDays-error"
                            role="alert"
                            className="mt-1 font-label-sm text-error"
                          >
                            {editErrors.desiredDeadlineDays}
                          </p>
                        )}
                      </div>
                    </div>
                  </fieldset>

                  <div className="flex items-center justify-end gap-sm border-t border-outline-variant/60 pt-md">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="rounded-lg border border-outline-variant px-md py-2 font-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center gap-xs rounded-lg bg-primary px-md py-2 font-label-md text-on-primary transition-colors hover:bg-primary-container disabled:opacity-60"
                    >
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-lg"
                      >
                        save
                      </span>
                      <span>
                        {isSaving ? "Salvando..." : "Salvar Alterações"}
                      </span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
                  {/* Left 2 columns: Process Info + DFD Info */}
                  <div className="space-y-lg lg:col-span-2">
                    {/* General Process Info */}
                    <section
                      aria-labelledby="section-general-heading"
                      className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg"
                    >
                      <div className="mb-md flex items-center gap-xs border-b border-outline-variant/50 pb-sm">
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined text-xl text-primary"
                        >
                          assignment
                        </span>
                        <h2
                          id="section-general-heading"
                          className="font-headline-sm font-bold text-on-surface"
                        >
                          Informações Gerais do Processo
                        </h2>
                      </div>

                      <dl className="space-y-sm font-body-sm">
                        <div>
                          <dt className="font-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                            Objeto da Contratação
                          </dt>
                          <dd className="mt-1 whitespace-pre-wrap font-body-md text-on-surface">
                            {processData.object}
                          </dd>
                        </div>

                        <div>
                          <dt className="font-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                            Descrição / Contexto Complementar
                          </dt>
                          <dd className="mt-1 whitespace-pre-wrap text-on-surface">
                            {processData.description || "Não informado"}
                          </dd>
                        </div>

                        <div className="grid grid-cols-1 gap-sm pt-xs sm:grid-cols-2">
                          <div className="rounded-lg bg-surface-container-low p-sm">
                            <dt className="font-label-sm text-on-surface-variant">
                              Valor Estimado
                            </dt>
                            <dd className="mt-1 font-headline-sm font-bold text-on-surface">
                              {formatCurrency(processData.estimatedValue)}
                            </dd>
                          </div>

                          <div className="rounded-lg bg-surface-container-low p-sm">
                            <dt className="font-label-sm text-on-surface-variant">
                              Fundamentação Legal
                            </dt>
                            <dd className="mt-1 font-body-sm font-semibold text-on-surface">
                              {processData.legalBasis ||
                                "A definir na etapa de enquadramento legal"}
                            </dd>
                          </div>
                        </div>
                      </dl>
                    </section>

                    {/* Associated DFD */}
                    <section
                      aria-labelledby="section-dfd-heading"
                      className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg"
                    >
                      <div className="mb-md flex items-center justify-between border-b border-outline-variant/50 pb-sm">
                        <div className="flex items-center gap-xs">
                          <span
                            aria-hidden="true"
                            className="material-symbols-outlined text-xl text-primary"
                          >
                            description
                          </span>
                          <h2
                            id="section-dfd-heading"
                            className="font-headline-sm font-bold text-on-surface"
                          >
                            Documento de Formalização da Demanda (DFD)
                          </h2>
                        </div>
                        {dfd && (
                          <span className="rounded bg-primary/10 px-2 py-0.5 font-label-sm text-primary">
                            Vinculado
                          </span>
                        )}
                      </div>

                      {!dfd ? (
                        <p className="font-body-sm text-on-surface-variant">
                          Nenhum DFD vinculado a este processo.
                        </p>
                      ) : (
                        <dl className="space-y-sm font-body-sm">
                          <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
                            <div>
                              <dt className="font-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                                Categoria do Objeto
                              </dt>
                              <dd className="mt-1 font-semibold text-on-surface">
                                {CATEGORY_LABELS[dfd.category] || dfd.category}
                              </dd>
                            </div>

                            <div>
                              <dt className="font-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                                Nível de Urgência
                              </dt>
                              <dd className="mt-1 font-semibold text-on-surface">
                                {URGENCY_LABELS[dfd.urgency] || dfd.urgency}
                              </dd>
                            </div>
                          </div>

                          <div>
                            <dt className="font-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                              Justificativa Detalhada da Necessidade
                            </dt>
                            <dd className="mt-1 whitespace-pre-wrap text-on-surface">
                              {dfd.detailedJustification}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                              Especificações Técnicas Preliminares
                            </dt>
                            <dd className="mt-1 whitespace-pre-wrap text-on-surface">
                              {dfd.technicalSpecifications || "Não informadas"}
                            </dd>
                          </div>

                          <div className="grid grid-cols-1 gap-sm border-t border-outline-variant/40 pt-sm sm:grid-cols-2">
                            <div>
                              <dt className="font-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                                Responsável pela Demanda
                              </dt>
                              <dd className="mt-1 text-on-surface">
                                {dfd.responsibleName}
                                {dfd.responsibleEmail
                                  ? ` (${dfd.responsibleEmail})`
                                  : ""}
                              </dd>
                            </div>

                            <div>
                              <dt className="font-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                                Prazo Desejado
                              </dt>
                              <dd className="mt-1 text-on-surface">
                                {dfd.desiredDeadlineDays
                                  ? `${dfd.desiredDeadlineDays} dias`
                                  : "Não informado"}
                              </dd>
                            </div>

                            <div className="sm:col-span-2">
                              <dt className="font-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                                Dotação Orçamentária
                              </dt>
                              <dd className="mt-1 text-on-surface">
                                {dfd.budgetSource || "Não informada"}
                              </dd>
                            </div>
                          </div>
                        </dl>
                      )}
                    </section>
                  </div>

                  {/* Right column: Administrative Metadata & Next Steps */}
                  <div className="space-y-lg">
                    <section
                      aria-labelledby="section-meta-heading"
                      className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md"
                    >
                      <h2
                        id="section-meta-heading"
                        className="mb-sm border-b border-outline-variant/50 pb-xs font-headline-sm font-bold text-on-surface"
                      >
                        Metadados Administrativos
                      </h2>

                      <dl className="space-y-2.5 font-body-sm">
                        <div>
                          <dt className="font-label-sm text-on-surface-variant">
                            Número / Ano
                          </dt>
                          <dd className="font-semibold text-on-surface">
                            {formattedNumber}
                          </dd>
                        </div>

                        <div>
                          <dt className="font-label-sm text-on-surface-variant">
                            Departamento Responsável
                          </dt>
                          <dd className="font-semibold text-on-surface">
                            {processData.department?.name || "—"}
                          </dd>
                        </div>

                        <div>
                          <dt className="font-label-sm text-on-surface-variant">
                            Solicitante
                          </dt>
                          <dd className="font-semibold text-on-surface">
                            {processData.requester?.name || "—"}
                          </dd>
                          {processData.requester?.email && (
                            <dd className="text-xs text-on-surface-variant">
                              {processData.requester.email}
                            </dd>
                          )}
                        </div>

                        <div>
                          <dt className="font-label-sm text-on-surface-variant">
                            Criado em
                          </dt>
                          <dd className="text-on-surface">
                            {formatDateTime(processData.createdAt)}
                          </dd>
                        </div>

                        <div>
                          <dt className="font-label-sm text-on-surface-variant">
                            Última atualização
                          </dt>
                          <dd className="text-on-surface">
                            {formatDateTime(processData.updatedAt)}
                          </dd>
                        </div>
                      </dl>
                    </section>

                    <section
                      aria-labelledby="section-modules-heading"
                      className="rounded-xl border border-outline-variant/70 bg-surface-container-low p-md"
                    >
                      <h2
                        id="section-modules-heading"
                        className="font-label-md font-bold text-on-surface"
                      >
                        Módulos Subsequentes do Processo
                      </h2>
                      <p className="mt-1 font-body-sm text-xs text-on-surface-variant">
                        Use as abas superiores para navegar pelos módulos de
                        instrução processual:
                      </p>
                      <ul className="mt-sm space-y-1.5 font-body-sm text-xs">
                        {MODULE_TABS.filter((t) => t.id !== "overview").map(
                          (t) => (
                            <li key={t.id}>
                              <button
                                type="button"
                                onClick={() => setActiveTab(t.id)}
                                className="flex w-full items-center justify-between rounded-md bg-surface-container-lowest px-sm py-2 text-left text-on-surface transition-colors hover:border-primary hover:text-primary"
                              >
                                <span className="flex items-center gap-1.5 font-medium">
                                  <span
                                    aria-hidden="true"
                                    className="material-symbols-outlined text-base text-primary"
                                  >
                                    {t.icon}
                                  </span>
                                  {t.label}
                                </span>
                                <span
                                  aria-hidden="true"
                                  className="material-symbols-outlined text-sm text-outline"
                                >
                                  chevron_right
                                </span>
                              </button>
                            </li>
                          ),
                        )}
                      </ul>
                    </section>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab Panel: Legal Classification */}
          {activeTab === "legal" && (
            <div
              id="tabpanel-legal"
              role="tabpanel"
              aria-labelledby="tab-legal"
            >
              <LegalClassificationTab
                processData={processData}
                canEdit={canEdit}
                onUpdated={refreshProcessData}
              />
            </div>
          )}

          {/* Tab Panel: Justifications and Supplier Selection */}
          {activeTab === "justifications" && (
            <div
              id="tabpanel-justifications"
              role="tabpanel"
              aria-labelledby="tab-justifications"
            >
              <JustificationsTab
                processData={processData}
                onUpdated={refreshProcessData}
              />
            </div>
          )}

          {/* Tab Panel: Process Review and Submission */}
          {activeTab === "review" && (
            <div
              id="tabpanel-review"
              role="tabpanel"
              aria-labelledby="tab-review"
            >
              <ProcessReviewTab
                processData={processData}
                onNavigateTab={(tabId) => setActiveTab(tabId)}
                onSubmitted={(result) => {
                  refreshProcessData();
                  setFeedbackBanner({
                    type: "success",
                    message:
                      result.message ||
                      "Processo submetido para análise interna com sucesso!",
                  });
                }}
              />
            </div>
          )}

          {/* Tab Panel: History / Audit */}
          {activeTab === "history" && (
            <div
              id="tabpanel-history"
              role="tabpanel"
              aria-labelledby="tab-history"
              className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg"
            >
              <div className="mb-md flex items-center gap-xs border-b border-outline-variant/50 pb-sm">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-xl text-primary"
                >
                  history
                </span>
                <h2 className="font-headline-sm font-bold text-on-surface">
                  Histórico de Eventos e Auditoria
                </h2>
              </div>

              {!processData.auditLogs || processData.auditLogs.length === 0 ? (
                <p className="font-body-sm text-on-surface-variant">
                  Nenhum evento de auditoria registrado até o momento.
                </p>
              ) : (
                <ol className="space-y-sm">
                  {processData.auditLogs.map((log) => (
                    <li
                      key={log.id}
                      className="flex flex-col justify-between gap-xs rounded-lg border border-outline-variant/50 bg-surface-container-low/50 p-sm sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-xs">
                          <span className="rounded bg-primary/10 px-2 py-0.5 font-label-sm font-bold text-primary">
                            {AUDIT_ACTION_LABELS[log.action] || log.action}
                          </span>
                          <span className="font-label-sm text-on-surface-variant">
                            por <strong>{log.user?.name || "Sistema"}</strong>
                            {log.user?.role
                              ? ` (${ROLE_LABELS[log.user.role] || log.user.role})`
                              : ""}
                          </span>
                        </div>
                        {log.description && (
                          <p className="mt-1 font-body-sm text-on-surface">
                            {log.description}
                          </p>
                        )}
                      </div>
                      <time
                        dateTime={log.createdAt}
                        className="whitespace-nowrap font-label-sm text-on-surface-variant"
                      >
                        {formatDateTime(log.createdAt)}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* Tab Panel: Documents */}
          {activeTab === "documents" && (
            <div
              id="tabpanel-documents"
              role="tabpanel"
              aria-labelledby="tab-documents"
            >
              <DocumentManagementTab
                processId={processData.id}
                documents={processData.documents || []}
                canManage={processData.permissions?.canManageDocuments}
                onDocumentUploaded={handleDocumentUploaded}
                onDocumentDeleted={handleDocumentDeleted}
              />
            </div>
          )}

          {/* Tab Panel: Quotations / Comparative Map */}
          {activeTab === "quotations" && (
            <div
              id="tabpanel-quotations"
              role="tabpanel"
              aria-labelledby="tab-quotations"
            >
              <PriceResearchTab
                processId={processData.id}
                quotations={processData.quotations || []}
                comparativeMap={processData.comparativeMap}
                suppliers={suppliers}
                canManage={processData.permissions?.canManageQuotations}
                onQuotationCreated={handleQuotationCreated}
                onQuotationUpdated={handleQuotationUpdated}
                onQuotationDeleted={handleQuotationDeleted}
                onSupplierCreated={handleSupplierSaved}
              />
            </div>
          )}

          {/* Tab Panel: Suppliers */}
          {activeTab === "supplier" && (
            <div
              id="tabpanel-supplier"
              role="tabpanel"
              aria-labelledby="tab-supplier"
            >
              <SupplierManagementTab
                suppliers={suppliers}
                userRole={user.role}
                onSupplierSaved={handleSupplierSaved}
              />
            </div>
          )}

          {/* Tab Panel: Approvals & Workflow */}
          {activeTab === "approvals" && (
            <div
              id="tabpanel-approvals"
              role="tabpanel"
              aria-labelledby="tab-approvals"
            >
              <ApprovalWorkflowTab
                processId={processData.id}
                processStatus={processData.status}
                workflowState={workflowState}
                user={user}
                onWorkflowActionSuccess={(msg) => {
                  setFeedbackBanner({
                    type: "success",
                    message: msg,
                  });
                  refreshProcessData();
                }}
              />
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
