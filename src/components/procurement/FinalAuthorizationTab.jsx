import { useState, useEffect } from "react";
import {
  formatCurrency,
  formatDateTime,
  formatDate,
  formatProcessNumber,
  CATEGORY_LABELS,
  URGENCY_LABELS,
  URGENCY_BADGE_STYLES,
  FINAL_AUTHORIZATION_DECISION_LABELS,
  FINAL_AUTHORIZATION_BADGES,
} from "@/components/dashboard/dashboardUtils";

export default function FinalAuthorizationTab({
  processId,
  processData,
  user,
  onActionSuccess,
}) {
  const [details, setDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // Modal states: null | "INITIATE" | "AUTHORIZE" | "REFUSE" | "ADJUSTMENTS"
  const [activeModal, setActiveModal] = useState(null);
  const [justification, setJustification] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const status = processData?.status;
  const isApproved = status === "APPROVED";
  const isAwaitingFinalAuth = status === "AWAITING_FINAL_AUTHORIZATION";
  const isRefused = status === "FINAL_AUTHORIZATION_REFUSED";
  const isAwaitingPublication = status === "AWAITING_PUBLICATION";
  const isCompleted = status === "COMPLETED";

  // Eligibility for AGENTE_CONTRATACAO to initiate final authorization
  const isAgent = user?.role === "AGENTE_CONTRATACAO";
  const isAuthority = user?.role === "AUTORIDADE_COMPETENTE";
  const isSameDepartment =
    user?.departmentId && user?.departmentId === processData?.departmentId;
  const isRequester =
    processData?.requesterId === user?.id ||
    processData?.requester?.id === user?.id ||
    processData?.userId === user?.id;

  const canInitiate = isApproved && isAgent && isSameDepartment && !isRequester;

  // Fetch detailed final authorization if user is authority or if in Phase 5
  useEffect(() => {
    let isMounted = true;

    async function loadFinalAuthDetails() {
      if (!processId) return;
      if (user?.role !== "AUTORIDADE_COMPETENTE") return;

      setIsLoadingDetails(true);
      setDetailsError(null);

      try {
        const res = await fetch(
          `/api/v1/processes/${processId}/final-authorization`,
        );
        const data = await res.json();

        if (!res.ok) {
          // If 403 or other, don't hard crash the tab, just save error message
          throw new Error(
            data.message ||
              "Não foi possível carregar os dados de deliberação.",
          );
        }

        if (isMounted) {
          setDetails(data);
        }
      } catch (err) {
        if (isMounted) {
          setDetailsError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoadingDetails(false);
        }
      }
    }

    loadFinalAuthDetails();

    return () => {
      isMounted = false;
    };
  }, [processId, user?.role, status]);

  const handleOpenModal = (modalType) => {
    setActiveModal(modalType);
    setJustification("");
    setActionError(null);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setActiveModal(null);
    setJustification("");
    setActionError(null);
  };

  // Submit Initiation
  const handleInitiateSubmit = async () => {
    setIsSubmitting(true);
    setActionError(null);

    try {
      const response = await fetch(
        `/api/v1/processes/${processId}/final-authorization/initiate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Erro ao encaminhar processo para autorização final.",
        );
      }

      setActionSuccess(data.message || "Processo encaminhado com sucesso!");
      handleCloseModal();
      if (onActionSuccess) {
        onActionSuccess(data.message);
      }
    } catch (err) {
      setActionError(err.message || "Erro na comunicação com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Authority Decision
  const handleDecisionSubmit = async () => {
    if (!activeModal) return;

    if (
      (activeModal === "REFUSE" || activeModal === "ADJUSTMENTS") &&
      (!justification || justification.trim().length < 10)
    ) {
      setActionError(
        "A justificativa formal detalhada é obrigatória (mínimo de 10 caracteres).",
      );
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    let endpoint = "";
    if (activeModal === "AUTHORIZE") {
      endpoint = `/api/v1/processes/${processId}/final-authorization/authorize`;
    } else if (activeModal === "REFUSE") {
      endpoint = `/api/v1/processes/${processId}/final-authorization/refuse`;
    } else if (activeModal === "ADJUSTMENTS") {
      endpoint = `/api/v1/processes/${processId}/final-authorization/request-adjustments`;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          justification: justification.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Erro ao registrar a decisão de autorização final.",
        );
      }

      setActionSuccess(data.message || "Decisão registrada com sucesso!");
      handleCloseModal();
      if (onActionSuccess) {
        onActionSuccess(data.message);
      }
    } catch (err) {
      setActionError(err.message || "Falha ao registrar deliberação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Combine processData and details for review
  const displayProcess = details || processData;
  const approvals = displayProcess?.approvals || [];
  const finalAuthDecisions =
    displayProcess?.finalAuthorizations ||
    (displayProcess?.historicalDecisions
      ? [
          ...displayProcess.historicalDecisions,
          ...(displayProcess.currentCycleDecision
            ? [displayProcess.currentCycleDecision]
            : []),
        ]
      : []);

  const demandDoc = displayProcess?.demandDocument;
  const supplier = displayProcess?.selectedSupplier;
  const documents = displayProcess?.documents || [];
  const canDecide = Boolean(
    details?.canDecide ??
    (isAuthority && isAwaitingFinalAuth && isSameDepartment && !isRequester),
  );

  return (
    <div className="space-y-md">
      {/* Feedback alerts */}
      {actionSuccess && (
        <div
          role="status"
          className="flex items-center gap-xs rounded-lg border border-primary/30 bg-primary/10 p-md text-primary"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-xl"
          >
            check_circle
          </span>
          <span className="font-body-sm font-semibold">{actionSuccess}</span>
        </div>
      )}

      {/* Overview Card: Final Authorization Status & Distinction */}
      <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg">
        <div className="flex flex-col justify-between gap-sm border-b border-outline-variant/40 pb-sm sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-xs font-headline-sm font-bold text-on-surface">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-primary"
              >
                verified
              </span>
              Autorização Final pela Autoridade Competente
            </h2>
            <p className="mt-1 font-body-sm text-on-surface-variant">
              Fase 5 — Deliberação soberana da Autoridade Competente após a
              conclusão da análise técnica e aprovação interna.
            </p>
          </div>

          <div className="flex items-center gap-xs">
            {isAwaitingFinalAuth && (
              <span className="inline-flex items-center gap-1 rounded-full border border-tertiary/30 bg-tertiary-fixed px-3 py-1 font-label-sm font-bold text-on-tertiary-fixed-variant">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-sm"
                >
                  hourglass_top
                </span>
                Aguardando autorização final
              </span>
            )}
            {isApproved && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary-fixed px-3 py-1 font-label-sm font-bold text-on-primary-fixed-variant">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-sm"
                >
                  check_circle
                </span>
                Aprovado na Fase 4 (Aguardando Encaminhamento)
              </span>
            )}
            {isRefused && (
              <span className="inline-flex items-center gap-1 rounded-full border border-error/20 bg-error-container px-3 py-1 font-label-sm font-bold text-on-error-container">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-sm"
                >
                  cancel
                </span>
                Autorização recusada
              </span>
            )}
            {(isAwaitingPublication || isCompleted) && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary-fixed px-3 py-1 font-label-sm font-bold text-on-primary-fixed-variant">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-sm"
                >
                  verified
                </span>
                Autorizado pela autoridade competente
              </span>
            )}
          </div>
        </div>

        {/* Distinction Banner: Internal Approval vs Final Authorization */}
        <div className="mt-md rounded-lg border border-outline-variant/60 bg-surface-container-low p-md">
          <div className="flex items-start gap-sm">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-xl text-primary"
            >
              info
            </span>
            <div className="space-y-1 font-body-sm text-on-surface-variant">
              <p className="font-semibold text-on-surface">
                Distinção Regulatória (Lei nº 14.133/2021):
              </p>
              <p>
                • <strong>Aprovação Interna (Fase 4):</strong> Parecer técnico e
                jurídico sobre a regularidade da instrução processual, cotações
                e enquadramento legal.
              </p>
              <p>
                • <strong>Autorização Final (Fase 5):</strong> Ato
                administrativo discricionário da autoridade máxima competente
                que autoriza a despesa e defere a contratação direta para fins
                de publicação oficial.
              </p>
            </div>
          </div>
        </div>

        {/* Action Callout for AGENTE_CONTRATACAO: Initiate Final Authorization */}
        {isApproved && (
          <div className="mt-md rounded-lg border border-primary/30 bg-primary/5 p-md">
            <div className="flex flex-col justify-between gap-md sm:flex-row sm:items-center">
              <div>
                <span className="inline-flex items-center gap-1 rounded bg-primary-container px-2 py-0.5 font-label-sm font-bold text-on-primary-container">
                  Pronto para Encaminhamento
                </span>
                <h3 className="mt-1 font-title-md font-bold text-on-surface">
                  Encaminhar Processo para a Autoridade Competente
                </h3>
                <p className="mt-0.5 font-body-sm text-on-surface-variant">
                  A instrução técnica e aprovação interna formal foram
                  concluídas com êxito. O processo deve agora ser encaminhado à
                  Autoridade Competente para deliberação final.
                </p>
              </div>

              {canInitiate ? (
                <button
                  type="button"
                  onClick={() => handleOpenModal("INITIATE")}
                  className="inline-flex shrink-0 items-center gap-xs rounded-lg bg-primary px-lg py-2.5 font-label-md font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-lg"
                  >
                    send
                  </span>
                  Encaminhar para Autoridade Competente
                </button>
              ) : (
                <div className="text-right text-xs text-outline">
                  {isRequester
                    ? "Segregação de Funções: O solicitante não pode encaminhar a própria demanda."
                    : !isSameDepartment
                      ? "Acesso restrito ao Agente de Contratação do departamento responsável."
                      : !isAgent
                        ? "Ação exclusiva do Agente de Contratação."
                        : ""}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Segregation of Duties Notice for Authority */}
        {isAuthority && isRequester && isAwaitingFinalAuth && (
          <div className="mt-md rounded-lg border border-error/30 bg-error-container/30 p-md text-on-error-container">
            <div className="flex items-center gap-sm">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-xl text-error"
              >
                gavel
              </span>
              <div>
                <p className="font-label-md font-bold">
                  Impedimento Legal por Segregação de Funções
                </p>
                <p className="font-body-sm text-xs">
                  Você é o solicitante original desta demanda. Conforme o Art.
                  7º, § 1º da Lei nº 14.133/2021, é vedado à autoridade
                  deliberar sobre processo que ela mesma formalizou. A decisão
                  deve ser proferida por outra autoridade competente designada.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Authority Decision Area */}
        {isAwaitingFinalAuth && isAuthority && canDecide && (
          <div className="mt-md rounded-lg border-2 border-primary/40 bg-surface-container-lowest p-md shadow-xs">
            <div className="flex flex-col justify-between gap-md sm:flex-row sm:items-center">
              <div>
                <span className="inline-flex items-center gap-1 rounded bg-tertiary-fixed px-2 py-0.5 font-label-sm font-bold text-on-tertiary-fixed-variant">
                  Ação Requerida da Autoridade
                </span>
                <h3 className="mt-1 font-title-md font-bold text-on-surface">
                  Deliberação da Autoridade Competente
                </h3>
                <p className="mt-0.5 font-body-sm text-on-surface-variant">
                  Examine o resumo instrutório abaixo e emita sua deliberação
                  formal soberana sobre este processo de contratação direta.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-xs">
                {/* 1. Autorizar */}
                <button
                  type="button"
                  onClick={() => handleOpenModal("AUTHORIZE")}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-md py-2 font-label-md font-semibold text-white shadow-xs transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-lg"
                  >
                    check_circle
                  </span>
                  Autorizar
                </button>

                {/* 2. Solicitar Ajustes */}
                <button
                  type="button"
                  onClick={() => handleOpenModal("ADJUSTMENTS")}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-400 bg-amber-50 px-md py-2 font-label-md font-semibold text-amber-900 shadow-xs transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-lg"
                  >
                    assignment_return
                  </span>
                  Solicitar Ajustes
                </button>

                {/* 3. Recusar */}
                <button
                  type="button"
                  onClick={() => handleOpenModal("REFUSE")}
                  className="inline-flex items-center gap-1 rounded-lg bg-error px-md py-2 font-label-md font-semibold text-on-error shadow-xs transition-colors hover:bg-error/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-lg"
                  >
                    cancel
                  </span>
                  Recusar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Review Dossier for Authority and Observers */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
        {/* Card 1: Process & DFD Summary */}
        <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md">
          <h3 className="flex items-center gap-xs font-title-md font-bold text-on-surface">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-primary"
            >
              description
            </span>
            Identificação & Documento de Demanda (DFD)
          </h3>

          <div className="mt-md space-y-sm text-sm">
            <div>
              <span className="font-label-sm text-outline">Número:</span>
              <p className="font-semibold text-on-surface">
                {formatProcessNumber(
                  displayProcess?.number,
                  displayProcess?.year,
                )}
              </p>
            </div>

            <div>
              <span className="font-label-sm text-outline">Objeto:</span>
              <p className="text-on-surface">{displayProcess?.object || "—"}</p>
            </div>

            <div className="grid grid-cols-2 gap-sm">
              <div>
                <span className="font-label-sm text-outline">
                  Departamento:
                </span>
                <p className="font-semibold text-on-surface">
                  {displayProcess?.department?.name || "—"}
                </p>
              </div>
              <div>
                <span className="font-label-sm text-outline">Solicitante:</span>
                <p className="font-semibold text-on-surface">
                  {displayProcess?.requester?.name || "—"}
                </p>
              </div>
            </div>

            {demandDoc && (
              <div className="rounded-md border border-outline-variant/40 bg-surface-container-low p-sm space-y-xs">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm font-semibold text-on-surface">
                    Categoria:{" "}
                    {CATEGORY_LABELS[demandDoc.category] || demandDoc.category}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      URGENCY_BADGE_STYLES[demandDoc.urgency] || ""
                    }`}
                  >
                    Urgência:{" "}
                    {URGENCY_LABELS[demandDoc.urgency] || demandDoc.urgency}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-outline">
                    Justificativa da Necessidade:
                  </span>
                  <p className="text-xs text-on-surface-variant line-clamp-3">
                    {demandDoc.detailedJustification}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Legal Classification & Supplier Selection */}
        <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md">
          <h3 className="flex items-center gap-xs font-title-md font-bold text-on-surface">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-primary"
            >
              gavel
            </span>
            Enquadramento Legal & Fornecedor Selecionado
          </h3>

          <div className="mt-md space-y-sm text-sm">
            <div>
              <span className="font-label-sm text-outline">
                Fundamentação Legal:
              </span>
              <p className="font-semibold text-on-surface">
                {displayProcess?.legalBasis || "Art. 75 da Lei nº 14.133/2021"}
              </p>
              {displayProcess?.legalJustification && (
                <p className="mt-1 text-xs text-on-surface-variant">
                  {displayProcess.legalJustification}
                </p>
              )}
            </div>

            <div className="rounded-md border border-outline-variant/40 bg-surface-container-low p-sm space-y-xs">
              <span className="font-label-sm font-semibold text-on-surface">
                Fornecedor Escolhido:
              </span>
              {supplier ? (
                <div>
                  <p className="font-semibold text-on-surface">
                    {supplier.legalName || supplier.tradeName}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    CNPJ: {supplier.cnpj || "—"}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-outline">
                  Nenhum fornecedor registrado.
                </p>
              )}

              <div className="mt-2 pt-2 border-t border-outline-variant/30 flex justify-between items-center">
                <span className="font-label-sm text-outline">
                  Valor Estimado / Homologado:
                </span>
                <span className="font-bold text-primary font-title-md">
                  {formatCurrency(displayProcess?.estimatedValue)}
                </span>
              </div>
            </div>

            {/* Document attachments summary */}
            <div>
              <span className="font-label-sm text-outline">
                Documentos Instrutórios ({documents.length}):
              </span>
              {documents.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {documents.slice(0, 4).map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between rounded bg-surface-container-lowest px-2 py-1 text-xs border border-outline-variant/40"
                    >
                      <span className="truncate max-w-[200px] text-on-surface">
                        {doc.filename}
                      </span>
                      <a
                        href={`/api/v1/processes/${processId}/documents/${doc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-semibold"
                      >
                        Visualizar
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-outline mt-0.5">
                  Nenhum documento anexado.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Internal Approval & Final Authorization History */}
      <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg">
        <h3 className="flex items-center gap-xs font-title-md font-bold text-on-surface">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-primary"
          >
            history
          </span>
          Histórico de Pareceres e Deliberações
        </h3>

        <div className="mt-md space-y-md">
          {/* Phase 4 Internal Approvals */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-outline mb-2">
              Aprovações Internas (Fase 4)
            </h4>
            {approvals.length > 0 ? (
              <div className="space-y-2">
                {approvals.map((app) => (
                  <div
                    key={app.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-outline-variant/40 bg-surface-container-low p-sm text-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-on-surface">
                          {app.stage === "ANALYSIS"
                            ? "Análise Técnica"
                            : "Aprovação Interna Formal"}
                        </span>
                        <span className="text-xs rounded bg-surface-container px-1.5 py-0.5 text-on-surface-variant">
                          Ciclo {app.cycle || 1}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                            app.decision === "APPROVED"
                              ? "bg-primary-fixed text-on-primary-fixed-variant"
                              : app.decision === "REJECTED"
                                ? "bg-error-container text-on-error-container"
                                : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {app.decision === "APPROVED"
                            ? "Aprovado"
                            : app.decision === "REJECTED"
                              ? "Rejeitado"
                              : "Ajuste Solicitado"}
                        </span>
                      </div>
                      {app.comment && (
                        <p className="mt-1 text-xs text-on-surface-variant italic">
                          &ldquo;{app.comment}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="mt-1 sm:mt-0 text-right text-xs text-outline">
                      <p>
                        {app.user?.name || app.decidedBy?.name || "Parecerista"}
                      </p>
                      <p>{formatDateTime(app.decidedAt || app.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-outline italic">
                Nenhum registro de aprovação interna disponível.
              </p>
            )}
          </div>

          {/* Phase 5 Final Authorization Decisions */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-outline mb-2">
              Deliberações da Autoridade Competente (Fase 5)
            </h4>
            {finalAuthDecisions.length > 0 ? (
              <div className="space-y-2">
                {finalAuthDecisions.map((fa) => {
                  const badge =
                    FINAL_AUTHORIZATION_BADGES[fa.decision] ||
                    FINAL_AUTHORIZATION_BADGES.AWAITING_FINAL_AUTHORIZATION;
                  return (
                    <div
                      key={fa.id}
                      className="flex flex-col sm:flex-row sm:items-start justify-between rounded-lg border border-outline-variant/60 bg-surface-container-low p-sm text-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold ${badge.classes}`}
                          >
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined text-xs"
                            >
                              {badge.icon}
                            </span>
                            {badge.label}
                          </span>
                          <span className="text-xs rounded bg-surface-container px-1.5 py-0.5 text-on-surface-variant">
                            Ciclo {fa.cycle}
                          </span>
                        </div>
                        {fa.justification && (
                          <div className="mt-1 rounded bg-surface-container-lowest p-2 border border-outline-variant/30 text-xs text-on-surface">
                            <span className="font-semibold block text-outline text-[11px]">
                              Fundamentação da Autoridade:
                            </span>
                            {fa.justification}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 sm:mt-0 text-right text-xs text-outline shrink-0">
                        <p className="font-semibold text-on-surface">
                          {fa.user?.name ||
                            fa.decidedBy?.name ||
                            "Autoridade Competente"}
                        </p>
                        <p>{formatDateTime(fa.decidedAt || fa.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-outline italic">
                {isAwaitingFinalAuth
                  ? "Aguardando deliberação da Autoridade Competente."
                  : "Nenhuma deliberação final registrada até o momento."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Initiate Final Authorization */}
      {activeModal === "INITIATE" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="initiate-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-md backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-xl">
            <h3
              id="initiate-modal-title"
              className="flex items-center gap-xs font-title-lg font-bold text-on-surface"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-primary"
              >
                send
              </span>
              Encaminhar para Autoridade Competente
            </h3>

            <p className="mt-2 font-body-sm text-on-surface-variant">
              Você está prestes a submeter este processo devidamente instruído e
              aprovado internamente para a deliberação soberana da Autoridade
              Competente.
            </p>

            <div className="mt-md rounded-lg border border-primary/20 bg-primary/5 p-sm text-xs text-on-surface-variant">
              <p className="font-semibold text-primary">Efeitos da Ação:</p>
              <p className="mt-0.5">
                O status do processo transitará para{" "}
                <strong>Aguardando Autorização Final</strong> (
                <code>AWAITING_FINAL_AUTHORIZATION</code>). A autoridade do
                departamento receberá a tarefa em sua caixa de deliberação.
              </p>
            </div>

            {actionError && (
              <div
                role="alert"
                className="mt-md rounded-md bg-error-container p-sm text-xs font-semibold text-on-error-container"
              >
                {actionError}
              </div>
            )}

            <div className="mt-lg flex justify-end gap-xs">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="rounded-lg border border-outline-variant px-md py-2 font-label-md text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleInitiateSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-lg py-2 font-label-md font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined animate-spin text-base"
                    >
                      progress_activity
                    </span>
                    Encaminhando...
                  </>
                ) : (
                  "Confirmar Encaminhamento"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Modals (AUTHORIZE, REFUSE, ADJUSTMENTS) */}
      {(activeModal === "AUTHORIZE" ||
        activeModal === "REFUSE" ||
        activeModal === "ADJUSTMENTS") && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="decision-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-md backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-xl">
            <h3
              id="decision-modal-title"
              className="flex items-center gap-xs font-title-lg font-bold text-on-surface"
            >
              {activeModal === "AUTHORIZE" && (
                <>
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-emerald-600"
                  >
                    check_circle
                  </span>
                  Confirmar Autorização da Contratação
                </>
              )}
              {activeModal === "REFUSE" && (
                <>
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-error"
                  >
                    cancel
                  </span>
                  Confirmar Recusa da Autorização
                </>
              )}
              {activeModal === "ADJUSTMENTS" && (
                <>
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-amber-600"
                  >
                    assignment_return
                  </span>
                  Solicitar Ajustes no Processo
                </>
              )}
            </h3>

            {/* Explanation text per decision type */}
            <div className="mt-2 text-sm text-on-surface-variant space-y-1">
              {activeModal === "AUTHORIZE" && (
                <p>
                  A autorização final atesta a conformidade da contratação
                  direta e autoriza a execução da despesa. O processo avançará
                  para a etapa de <strong>Registro de Publicação</strong> (
                  <code>AWAITING_PUBLICATION</code>).
                </p>
              )}
              {activeModal === "REFUSE" && (
                <div className="rounded-md border border-error/30 bg-error-container/30 p-sm text-xs text-on-error-container">
                  <p className="font-bold">Atenção — Decisão Terminal:</p>
                  <p>
                    A recusa pela autoridade competente encerra o processo com
                    status definitivo <strong>Autorização Recusada</strong> (
                    <code>FINAL_AUTHORIZATION_REFUSED</code>). Não se confunde
                    com a rejeição técnica interna.
                  </p>
                </div>
              )}
              {activeModal === "ADJUSTMENTS" && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-sm text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <p className="font-bold">Retorno para Correções:</p>
                  <p>
                    O processo retornará ao solicitante (
                    <code>RETURNED_FOR_ADJUSTMENT</code>) para que as
                    inadequações sejam sanadas, devendo reiniciar o ciclo de
                    análise técnica e aprovação antes de nova submissão à
                    autoridade.
                  </p>
                </div>
              )}
            </div>

            {/* Justification Field */}
            <div className="mt-md">
              <label
                htmlFor="final-auth-justification"
                className="block font-label-md font-semibold text-on-surface mb-1"
              >
                {activeModal === "AUTHORIZE"
                  ? "Justificativa / Parecer Homologatório (Opcional):"
                  : "Fundamentação Formal Obrigatória (Mínimo de 10 caracteres):"}
              </label>
              <textarea
                id="final-auth-justification"
                rows={4}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder={
                  activeModal === "AUTHORIZE"
                    ? "Registre observações ou fundamentação da homologação..."
                    : activeModal === "REFUSE"
                      ? "Descreva detalhadamente as razões formais de interesse público ou legalidade que justificam a recusa..."
                      : "Especifique quais documentos, cotações ou justificativas precisam ser corrigidos pelo solicitante..."
                }
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 font-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {(activeModal === "REFUSE" || activeModal === "ADJUSTMENTS") && (
                <div className="mt-1 flex justify-between text-[11px] text-outline">
                  <span>Mínimo 10 caracteres</span>
                  <span>{justification.trim().length}/10</span>
                </div>
              )}
            </div>

            {actionError && (
              <div
                role="alert"
                className="mt-md rounded-md bg-error-container p-sm text-xs font-semibold text-on-error-container"
              >
                {actionError}
              </div>
            )}

            <div className="mt-lg flex justify-end gap-xs">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="rounded-lg border border-outline-variant px-md py-2 font-label-md text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDecisionSubmit}
                disabled={
                  isSubmitting ||
                  ((activeModal === "REFUSE" ||
                    activeModal === "ADJUSTMENTS") &&
                    justification.trim().length < 10)
                }
                className={`inline-flex items-center gap-1 rounded-lg px-lg py-2 font-label-md font-semibold text-white shadow-xs transition-colors disabled:opacity-50 ${
                  activeModal === "AUTHORIZE"
                    ? "bg-emerald-700 hover:bg-emerald-800"
                    : activeModal === "REFUSE"
                      ? "bg-error hover:bg-error/90 text-on-error"
                      : "bg-amber-600 hover:bg-amber-700 text-white"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined animate-spin text-base"
                    >
                      progress_activity
                    </span>
                    Registrando...
                  </>
                ) : activeModal === "AUTHORIZE" ? (
                  "Confirmar Autorização"
                ) : activeModal === "REFUSE" ? (
                  "Confirmar Recusa Definitiva"
                ) : (
                  "Confirmar Solicitação de Ajustes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
