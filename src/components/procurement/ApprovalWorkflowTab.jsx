import { useState } from "react";
import { formatDateTime } from "@/components/dashboard/dashboardUtils";

const STAGE_LABELS = {
  ANALYSIS: "Etapa 1: Análise Técnica & Instrução",
  APPROVAL: "Etapa 2: Aprovação Interna Formal",
};

const DECISION_BADGES = {
  APPROVED: {
    label: "Aprovado",
    classes: "bg-primary-fixed text-on-primary-fixed-variant border-primary/20",
    icon: "check_circle",
  },
  ADJUSTMENT_REQUESTED: {
    label: "Ajuste Solicitado",
    classes:
      "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/40",
    icon: "assignment_return",
  },
  REJECTED: {
    label: "Rejeitado",
    classes: "bg-error-container text-on-error-container border-error/20",
    icon: "cancel",
  },
  PENDING: {
    label: "Pendente de Decisão",
    classes:
      "bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary/30",
    icon: "hourglass_top",
  },
};

export default function ApprovalWorkflowTab({
  processId,
  processStatus,
  workflowState,
  user,
  onWorkflowActionSuccess,
}) {
  const [activeModal, setActiveModal] = useState(null); // "APPROVE" | "ADJUSTMENT" | "REJECT"
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const pendingTask = workflowState?.pendingTask;
  const permissions = workflowState?.permissions || {};
  const cycles = workflowState?.cycles || [];

  const handleOpenModal = (modalType) => {
    setActiveModal(modalType);
    setComment("");
    setErrorMessage(null);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setActiveModal(null);
    setComment("");
    setErrorMessage(null);
  };

  const handleDecisionSubmit = async () => {
    if (!activeModal) return;

    if (
      (activeModal === "ADJUSTMENT" || activeModal === "REJECT") &&
      (!comment || comment.trim().length < 10)
    ) {
      setErrorMessage(
        "É obrigatório fornecer uma justificativa detalhada (mínimo de 10 caracteres).",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    let endpoint = "";
    if (activeModal === "APPROVE") {
      endpoint = `/api/v1/processes/${processId}/workflow/approve`;
    } else if (activeModal === "ADJUSTMENT") {
      endpoint = `/api/v1/processes/${processId}/workflow/request-adjustment`;
    } else if (activeModal === "REJECT") {
      endpoint = `/api/v1/processes/${processId}/workflow/reject`;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: comment.trim() || undefined,
          approvalId: pendingTask?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao processar decisão do fluxo.");
      }

      handleCloseModal();
      if (onWorkflowActionSuccess) {
        onWorkflowActionSuccess(data.message);
      }
    } catch (err) {
      setErrorMessage(err.message || "Ocorreu um erro ao registrar a decisão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-md">
      {/* Current Workflow Status Overview Card */}
      <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg">
        <div className="flex flex-col justify-between gap-sm border-b border-outline-variant/40 pb-sm sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-xs font-headline-sm font-bold text-on-surface">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-primary"
              >
                account_tree
              </span>
              Fluxo de Análise e Aprovação Interna
            </h2>
            <p className="mt-1 font-body-sm text-on-surface-variant">
              Ciclo de análise técnica por Agente de Contratação e decisão
              homologatória por Aprovador institucional.
            </p>
          </div>
          <div className="flex items-center gap-xs">
            <span className="rounded-md border border-outline-variant/60 bg-surface-container-high px-2.5 py-1 font-label-sm font-bold text-on-surface">
              Ciclo Atual: {workflowState?.currentCycle || 1}
            </span>
          </div>
        </div>

        {/* Pending Task Decision Area */}
        {pendingTask ? (
          <div className="mt-md rounded-lg border border-primary/30 bg-primary/5 p-md">
            <div className="flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
              <div>
                <span className="inline-flex items-center gap-1 rounded bg-tertiary-fixed px-2 py-0.5 font-label-sm font-bold text-on-tertiary-fixed-variant">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-xs"
                  >
                    hourglass_top
                  </span>
                  Etapa Pendente de Ação
                </span>
                <h3 className="mt-1 font-title-md font-bold text-on-surface">
                  {STAGE_LABELS[pendingTask.stage] || pendingTask.stage}
                </h3>
                <p className="font-body-sm text-on-surface-variant">
                  Responsável:{" "}
                  <strong>
                    {pendingTask.assignedRole === "AGENTE_CONTRATACAO"
                      ? "Agente de Contratação"
                      : "Aprovador Institucional"}
                  </strong>{" "}
                  do departamento competente.
                </p>
              </div>

              {/* Action Buttons if authorized */}
              {permissions.canAct ? (
                <div className="flex flex-wrap items-center gap-xs">
                  <button
                    type="button"
                    onClick={() => handleOpenModal("APPROVE")}
                    className="inline-flex items-center gap-xs rounded-lg bg-primary px-md py-2 font-label-md font-medium text-on-primary transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-base"
                    >
                      check_circle
                    </span>
                    {pendingTask.stage === "ANALYSIS"
                      ? "Aprovar Análise & Encaminhar"
                      : "Aprovar Processo"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenModal("ADJUSTMENT")}
                    className="inline-flex items-center gap-xs rounded-lg border border-amber-500/40 bg-amber-500/10 px-md py-2 font-label-md font-medium text-amber-900 transition-colors hover:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:text-amber-200"
                  >
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-base"
                    >
                      assignment_return
                    </span>
                    Solicitar Ajustes
                  </button>

                  {permissions.canReject && (
                    <button
                      type="button"
                      onClick={() => handleOpenModal("REJECT")}
                      className="inline-flex items-center gap-xs rounded-lg border border-error/30 bg-error/10 px-md py-2 font-label-md font-medium text-error transition-colors hover:bg-error/20 focus:outline-none focus:ring-2 focus:ring-error/20"
                    >
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-base"
                      >
                        cancel
                      </span>
                      Rejeitar Processo
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border border-outline-variant/60 bg-surface-container-high px-sm py-2 text-xs text-on-surface-variant">
                  <span className="font-bold">Aviso:</span> Você está
                  visualizando este processo em modo consulta.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-md rounded-lg border border-outline-variant/60 bg-surface-container-low p-md">
            <p className="font-body-md text-on-surface">
              {processStatus === "APPROVED" && (
                <span className="inline-flex items-center gap-xs font-bold text-primary">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined"
                  >
                    verified
                  </span>
                  Processo aprovado formalmente. Tramitação interna concluída
                  com sucesso.
                </span>
              )}
              {processStatus === "REJECTED" && (
                <span className="inline-flex items-center gap-xs font-bold text-error">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined"
                  >
                    cancel
                  </span>
                  Processo rejeitado e encerrado definitivamente na etapa de
                  aprovação.
                </span>
              )}
              {processStatus === "RETURNED_FOR_ADJUSTMENT" && (
                <span className="inline-flex items-center gap-xs font-bold text-amber-800 dark:text-amber-300">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined"
                  >
                    assignment_return
                  </span>
                  Processo devolvido para correções do solicitante. Aguardando
                  ajustes e nova submissão.
                </span>
              )}
              {processStatus === "DRAFT" && (
                <span className="font-body-sm text-on-surface-variant">
                  O processo encontra-se em elaboração (Rascunho). Complete a
                  instrução e submeta para iniciar a análise interna.
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Workflow Timeline by Cycles */}
      <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg">
        <h3 className="mb-sm flex items-center gap-xs font-headline-sm font-bold text-on-surface">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-primary"
          >
            history_edu
          </span>
          Histórico de Pareceres e Decisões
        </h3>

        {cycles.length === 0 ? (
          <p className="font-body-sm text-on-surface-variant">
            Nenhuma decisão de análise ou aprovação registrada até o momento.
          </p>
        ) : (
          <div className="space-y-md">
            {cycles.map((c) => (
              <div
                key={c.cycleNumber}
                className="rounded-lg border border-outline-variant/50 bg-surface-container-low/30 p-sm sm:p-md"
              >
                <div className="mb-xs flex items-center justify-between border-b border-outline-variant/40 pb-xs">
                  <h4 className="font-label-md font-bold text-on-surface">
                    Ciclo de Avaliação #{c.cycleNumber}
                  </h4>
                  <span className="text-xs text-on-surface-variant">
                    {c.items.length} etapa(s) no ciclo
                  </span>
                </div>

                <ol className="mt-sm space-y-sm">
                  {c.items.map((item) => {
                    const badge = item.isPending
                      ? DECISION_BADGES.PENDING
                      : DECISION_BADGES[item.decision] ||
                        DECISION_BADGES.PENDING;

                    return (
                      <li
                        key={item.id}
                        className="rounded-md border border-outline-variant/40 bg-surface-container-lowest p-sm"
                      >
                        <div className="flex flex-col justify-between gap-xs sm:flex-row sm:items-center">
                          <div className="flex items-center gap-xs">
                            <span
                              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-label-sm font-bold ${badge.classes}`}
                            >
                              <span
                                aria-hidden="true"
                                className="material-symbols-outlined text-xs"
                              >
                                {badge.icon}
                              </span>
                              {badge.label}
                            </span>
                            <span className="font-body-sm font-bold text-on-surface">
                              {STAGE_LABELS[item.stage] || item.stage}
                            </span>
                          </div>

                          <time className="text-xs text-on-surface-variant">
                            {item.decidedAt
                              ? `Decidido em ${formatDateTime(item.decidedAt)}`
                              : `Atribuído em ${formatDateTime(item.createdAt)}`}
                          </time>
                        </div>

                        {item.reviewer && (
                          <div className="mt-1 text-xs text-on-surface-variant">
                            Avaliador: <strong>{item.reviewer.name}</strong> (
                            {item.reviewer.role})
                          </div>
                        )}

                        {item.comment && (
                          <div className="mt-xs rounded bg-surface-container-low p-2 text-xs text-on-surface">
                            <span className="font-bold">
                              Parecer / Justificativa:
                            </span>{" "}
                            &ldquo;{item.comment}&rdquo;
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-sm backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-xl sm:p-lg">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-sm">
              <h3 className="font-title-lg font-bold text-on-surface">
                {activeModal === "APPROVE" &&
                  (pendingTask?.stage === "ANALYSIS"
                    ? "Aprovar Análise Técnica & Encaminhar"
                    : "Aprovar Processo Formalmente")}
                {activeModal === "ADJUSTMENT" &&
                  "Solicitar Ajustes ao Solicitante"}
                {activeModal === "REJECT" && "Rejeitar e Encerrar Processo"}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="rounded-md p-1 text-outline hover:bg-surface-container hover:text-on-surface"
              >
                <span aria-hidden="true" className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>

            <div className="mt-md space-y-sm">
              {activeModal === "APPROVE" && (
                <p className="font-body-sm text-on-surface-variant">
                  {pendingTask?.stage === "ANALYSIS"
                    ? "Ao aprovar esta etapa, você atesta a conformidade da instrução processual (DFD, cotações, mapa de preços e documentos). O processo será encaminhado para a Aprovação Interna."
                    : "Ao aprovar formalmente este processo, você conclui a autorização institucional para a dispensa de licitação. O processo ficará apto para a fase de homologação e publicação."}
                </p>
              )}

              {activeModal === "ADJUSTMENT" && (
                <p className="font-body-sm text-on-surface-variant">
                  O processo retornará para o status{" "}
                  <strong>Devolvido para Ajustes</strong> e o solicitante poderá
                  atualizar as informações apontadas. Ao ser reenviado, uma nova
                  rodada de análise técnica será iniciada.
                </p>
              )}

              {activeModal === "REJECT" && (
                <div className="rounded-lg border border-error/40 bg-error-container/30 p-sm font-body-sm text-on-error-container">
                  <strong>Atenção:</strong> A rejeição encerra definitivamente o
                  processo administrativo sem possibilidade de reabertura comum.
                  Certifique-se de fundamentar as razões formais da recusa.
                </div>
              )}

              {errorMessage && (
                <div className="rounded-md bg-error-container p-sm font-body-sm text-on-error-container">
                  {errorMessage}
                </div>
              )}

              <div>
                <label
                  htmlFor="decision-comment"
                  className="mb-1 block font-label-sm font-bold text-on-surface"
                >
                  {activeModal === "APPROVE"
                    ? "Parecer Técnico / Observações (Opcional):"
                    : "Justificativa Formal (Obrigatória, mín. 10 caracteres):"}
                </label>
                <textarea
                  id="decision-comment"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    activeModal === "APPROVE"
                      ? "Insira observações ou ressalvas pertinentes à etapa..."
                      : "Descreva detalhadamente os motivos da devolução ou rejeição..."
                  }
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 font-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="mt-md flex justify-end gap-xs border-t border-outline-variant/40 pt-sm">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="rounded-lg border border-outline-variant bg-surface-container px-md py-2 font-label-md text-on-surface hover:bg-surface-container-high"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDecisionSubmit}
                disabled={isSubmitting}
                className={`inline-flex items-center gap-xs rounded-lg px-md py-2 font-label-md font-medium text-white shadow-sm transition-colors ${
                  activeModal === "REJECT"
                    ? "bg-error hover:bg-error/90"
                    : activeModal === "ADJUSTMENT"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-primary hover:bg-primary/90"
                }`}
              >
                {isSubmitting && (
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined animate-spin text-base"
                  >
                    progress_activity
                  </span>
                )}
                {activeModal === "APPROVE" && "Confirmar Aprovação"}
                {activeModal === "ADJUSTMENT" && "Confirmar Devolução"}
                {activeModal === "REJECT" && "Confirmar Rejeição"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
