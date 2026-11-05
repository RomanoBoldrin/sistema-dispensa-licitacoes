import { useState } from "react";
import ProcessStatusBadge from "@/components/dashboard/ProcessStatusBadge";
import {
  formatCurrency,
  formatDateTime,
} from "@/components/dashboard/dashboardUtils";

export default function ProcessReviewTab({
  processData,
  onNavigateTab,
  onSubmitted,
}) {
  const completeness = processData?.completeness || {};
  const isComplete = Boolean(completeness.isComplete);
  const checklist = completeness.checklist || {};
  const permissions = processData?.permissions || {};
  const canSubmit = Boolean(processData?.canSubmit || permissions.canSubmit);
  const isAlreadySubmitted = [
    "AWAITING_APPROVAL",
    "APPROVED",
    "COMPLETED",
  ].includes(processData?.status);

  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(
        `/api/v1/processes/${processData.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Erro ao submeter processo para análise.",
        );
      }

      setIsConfirming(false);
      if (onSubmitted) {
        onSubmitted(result);
      }
    } catch (err) {
      setSubmitError(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const checklistSections = [
    {
      key: "general",
      title: "1. Dados Gerais do Processo",
      tabId: "overview",
      icon: "description",
      status: checklist.general?.complete,
      items: checklist.general?.items || [],
    },
    {
      key: "dfd",
      title: "2. Formalização da Demanda (DFD)",
      tabId: "overview",
      icon: "assignment",
      status: checklist.dfd?.complete,
      items: checklist.dfd?.items || [],
    },
    {
      key: "legal",
      title: "3. Enquadramento Legal (Art. 75)",
      tabId: "legal",
      icon: "gavel",
      status: checklist.legal?.complete,
      items: checklist.legal?.items || [],
    },
    {
      key: "quotations",
      title: "4. Pesquisa de Preços",
      tabId: "quotations",
      icon: "request_quote",
      status: checklist.quotations?.complete,
      items: checklist.quotations?.items || [],
    },
    {
      key: "supplierSelection",
      title: "5. Seleção e Justificativa do Fornecedor",
      tabId: "justifications",
      icon: "storefront",
      status: checklist.supplierSelection?.complete,
      items: checklist.supplierSelection?.items || [],
    },
    {
      key: "priceJustification",
      title: "6. Justificativa de Preço",
      tabId: "justifications",
      icon: "payments",
      status: checklist.priceJustification?.complete,
      items: checklist.priceJustification?.items || [],
    },
    {
      key: "documents",
      title: "7. Documentação Instrutória",
      tabId: "documents",
      icon: "folder_open",
      status: checklist.documents?.complete,
      items: checklist.documents?.items || [],
    },
  ];

  return (
    <div className="space-y-lg">
      {/* Submitted Status Banner */}
      {isAlreadySubmitted && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-md sm:p-lg flex flex-col sm:flex-row sm:items-center justify-between gap-md">
          <div className="space-y-1">
            <div className="flex items-center gap-xs text-primary font-bold">
              <span className="material-symbols-outlined text-2xl">
                verified
              </span>
              <h2 className="font-headline-sm">
                Processo Submetido para Análise Interna
              </h2>
            </div>
            <p className="font-body-sm text-xs text-on-surface">
              Este processo já foi formalizado e enviado para deliberação da
              comissão / autoridade competente. A edição ordinária pelo
              solicitante encontra-se bloqueada.
            </p>
          </div>
          <ProcessStatusBadge status={processData.status} />
        </div>
      )}

      {/* Review Summary Header */}
      <section
        aria-labelledby="review-header-title"
        className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg space-y-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm border-b border-outline-variant/50 pb-sm">
          <div>
            <span className="rounded bg-primary/10 px-2 py-0.5 font-label-sm font-bold text-primary">
              Etapa Conclusiva da Instrução
            </span>
            <h2
              id="review-header-title"
              className="mt-1 font-headline-sm font-bold text-on-surface"
            >
              Revisão Geral e Checklist de Submissão
            </h2>
          </div>
          <div>
            <ProcessStatusBadge status={processData.status} />
          </div>
        </div>

        <p className="font-body-sm text-xs text-on-surface-variant">
          Revise todos os itens de instrução do processo antes de submetê-lo
          para a análise interna. O sistema realiza a validação cruzada do DFD,
          enquadramento jurídico, cotações, seleção do fornecedor e
          justificativas.
        </p>

        {/* Blocking Errors Callout */}
        {completeness.errors?.length > 0 && !isAlreadySubmitted && (
          <div
            role="alert"
            className="rounded-lg border border-error bg-error-container p-md space-y-xs text-on-error-container font-body-sm text-xs"
          >
            <div className="flex items-center gap-1 font-bold font-label-md">
              <span className="material-symbols-outlined text-lg">error</span>
              <span>
                Pendências Impeditivas para Submissão (
                {completeness.errors.length}):
              </span>
            </div>
            <ul className="list-disc pl-5 space-y-1">
              {completeness.errors.map((err, idx) => (
                <li key={idx}>
                  <strong>{err.section}:</strong> {err.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Advisory Warnings */}
        {completeness.warnings?.length > 0 && (
          <div className="rounded-lg border border-tertiary/40 bg-tertiary-fixed/30 p-md space-y-xs text-on-tertiary-fixed-variant font-body-sm text-xs">
            <div className="flex items-center gap-1 font-bold font-label-md text-tertiary">
              <span className="material-symbols-outlined text-lg">warning</span>
              <span>
                Alertas e Orientações Consultivas (
                {completeness.warnings.length}):
              </span>
            </div>
            <ul className="list-disc pl-5 space-y-1">
              {completeness.warnings.map((warn, idx) => (
                <li key={idx}>{warn.message}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Checklist Sections Grid */}
      <section
        aria-labelledby="checklist-title"
        className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg space-y-md"
      >
        <h3
          id="checklist-title"
          className="font-headline-sm font-bold text-on-surface"
        >
          Checklist de Requisitos Obrigatórios
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
          {checklistSections.map((sec) => (
            <div
              key={sec.key}
              className={`rounded-lg border p-md flex flex-col justify-between transition-colors ${
                sec.status
                  ? "border-primary/30 bg-surface-container-lowest"
                  : "border-error/30 bg-error-container/20"
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30">
                  <span className="flex items-center gap-1.5 font-label-md font-bold text-on-surface">
                    <span
                      aria-hidden="true"
                      className={`material-symbols-outlined text-base ${
                        sec.status ? "text-primary" : "text-error"
                      }`}
                    >
                      {sec.icon}
                    </span>
                    {sec.title}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      sec.status
                        ? "bg-primary/10 text-primary"
                        : "bg-error-container text-on-error-container"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {sec.status ? "check" : "close"}
                    </span>
                    {sec.status ? "Completo" : "Pendente"}
                  </span>
                </div>

                <ul className="mt-2 space-y-1 text-xs font-body-sm text-on-surface-variant">
                  {sec.items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className={`material-symbols-outlined text-sm ${
                          item.passed ? "text-primary" : "text-error"
                        }`}
                      >
                        {item.passed ? "check_circle" : "cancel"}
                      </span>
                      <span
                        className={
                          item.passed
                            ? "text-on-surface"
                            : "text-error font-medium"
                        }
                      >
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {!sec.status && onNavigateTab && (
                <div className="mt-3 pt-2 border-t border-outline-variant/30 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onNavigateTab(sec.tabId)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <span>Preencher nesta aba</span>
                    <span className="material-symbols-outlined text-xs">
                      arrow_forward
                    </span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Submission Action Bar */}
      {!isAlreadySubmitted && (
        <section
          aria-labelledby="submission-action-heading"
          className="rounded-xl border border-primary/40 bg-surface-container-lowest p-md sm:p-lg space-y-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
            <div>
              <h3
                id="submission-action-heading"
                className="font-headline-sm font-bold text-on-surface"
              >
                Submissão do Processo
              </h3>
              <p className="mt-1 font-body-sm text-xs text-on-surface-variant max-w-xl">
                Ao submeter o processo, o status avançará para{" "}
                <strong>Aguardando Aprovação</strong>. O processo será
                encaminhado para a análise do órgão de contratação e suas
                informações serão bloqueadas para edição direta pelo
                solicitante.
              </p>
            </div>

            <div>
              <button
                type="button"
                disabled={!isComplete || !canSubmit}
                onClick={() => setIsConfirming(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-xs rounded-lg bg-primary px-xl py-3 font-label-md font-bold text-on-primary hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-xl">send</span>
                <span>Submeter para Análise Interna</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Confirmation Modal */}
      {isConfirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setIsConfirming(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-sm backdrop-blur-sm"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-md sm:p-lg space-y-md shadow-xl">
            <div className="flex items-center gap-xs border-b border-outline-variant/40 pb-xs">
              <span className="material-symbols-outlined text-2xl text-primary">
                help
              </span>
              <h3
                id="confirm-modal-title"
                className="font-headline-sm font-bold text-on-surface"
              >
                Confirmar Submissão do Processo
              </h3>
            </div>

            <p className="font-body-sm text-sm text-on-surface">
              Você está prestes a formalizar e submeter o processo{" "}
              <strong>
                DP-{String(processData.number).padStart(3, "0")}/
                {processData.year}
              </strong>{" "}
              para análise interna.
            </p>

            <div className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-sm text-xs space-y-1 font-body-sm text-on-surface-variant">
              <div className="flex justify-between">
                <span>Objeto:</span>
                <strong className="text-on-surface truncate max-w-xs">
                  {processData.title}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Valor Estimado:</span>
                <strong className="text-on-surface">
                  {formatCurrency(processData.estimatedValue)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Fornecedor Proposto:</span>
                <strong className="text-on-surface">
                  {processData.selectedSupplier?.legalName || "—"}
                </strong>
              </div>
            </div>

            <p className="font-body-sm text-xs text-error font-medium">
              Atenção: após a submissão, os dados do processo ficarão congelados
              e não poderão ser editados diretamente até a conclusão da análise
              interna.
            </p>

            {submitError && (
              <div
                role="alert"
                className="rounded-lg border border-error bg-error-container p-sm text-on-error-container font-body-sm text-xs"
              >
                {submitError}
              </div>
            )}

            <div className="flex justify-end gap-xs pt-xs border-t border-outline-variant/40">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsConfirming(false)}
                className="rounded-lg border border-outline-variant px-md py-2 font-label-md text-on-surface hover:bg-surface-container-low disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-lg py-2 font-label-md font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">
                      progress_activity
                    </span>
                    <span>Submetendo...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">
                      check
                    </span>
                    <span>Confirmar e Enviar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
