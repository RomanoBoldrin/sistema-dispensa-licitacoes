import { useState } from "react";
import { formatCurrency } from "@/components/dashboard/dashboardUtils";
import {
  ANNUAL_THRESHOLDS,
  DEFAULT_THRESHOLD_YEAR,
  LEGAL_HYPOTHESES,
} from "@/domain/legal-classification";

export default function LegalClassificationTab({
  processData,
  canEdit,
  onUpdated,
}) {
  const currentBasis = processData?.legalBasis || "";
  const currentJustification = processData?.legalJustification || "";
  const validation = processData?.legalValidation || {};

  const processYear =
    Number(processData?.year) ||
    (processData?.createdAt
      ? new Date(processData.createdAt).getFullYear()
      : DEFAULT_THRESHOLD_YEAR);

  const [selectedHypothesis, setSelectedHypothesis] = useState(
    validation?.hypothesis?.key || currentBasis || "ART_75_II",
  );
  const [justification, setJustification] = useState(currentJustification);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const thresholdsForYear =
    ANNUAL_THRESHOLDS[processYear] || ANNUAL_THRESHOLDS[DEFAULT_THRESHOLD_YEAR];

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/v1/processes/${processData.id}/legal-classification`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            legalBasis: selectedHypothesis,
            legalJustification: justification.trim() || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Erro ao salvar enquadramento jurídico.",
        );
      }

      setSuccessMessage("Enquadramento jurídico atualizado com sucesso!");
      if (onUpdated) onUpdated();
    } catch (err) {
      setErrorMessage(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedHypoInfo = LEGAL_HYPOTHESES[selectedHypothesis];

  return (
    <div className="space-y-lg">
      {/* Messages */}
      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-xs rounded-lg border border-primary/30 bg-primary/10 p-md text-primary font-body-sm font-semibold"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-xl"
          >
            check_circle
          </span>
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-xs rounded-lg border border-error bg-error-container p-md text-on-error-container font-body-sm"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-xl"
          >
            error
          </span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Legislative Reference Banner */}
      <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg space-y-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm border-b border-outline-variant/50 pb-sm">
          <div>
            <span className="rounded bg-primary/10 px-2 py-0.5 font-label-sm font-bold text-primary">
              Lei Federal nº 14.133/2021
            </span>
            <h2 className="mt-1 font-headline-sm font-bold text-on-surface">
              Classificação Legal e Limites da Dispensa de Licitação
            </h2>
          </div>
          <div className="text-left sm:text-right text-xs font-body-sm text-on-surface-variant">
            <span>Exercício de referência: </span>
            <strong className="text-on-surface">{processYear}</strong>
          </div>
        </div>

        {/* Centralized Limits Table */}
        <div className="overflow-x-auto pt-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/60 font-label-sm text-on-surface-variant">
                <th className="py-2 pr-4 font-semibold">Dispositivo Legal</th>
                <th className="py-2 pr-4 font-semibold">Objeto Aplicável</th>
                <th className="py-2 pr-4 font-semibold">
                  Limite Legal ({processYear})
                </th>
                <th className="py-2 font-semibold">Regulamentação Atual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 text-on-surface">
              <tr>
                <td className="py-2.5 pr-4 font-bold text-primary">
                  Art. 75, Inciso I
                </td>
                <td className="py-2.5 pr-4">
                  Obras e serviços de engenharia / manutenção automotiva
                </td>
                <td className="py-2.5 pr-4 font-semibold">
                  {formatCurrency(thresholdsForYear.incisoI.limit)}
                </td>
                <td className="py-2.5 text-on-surface-variant">
                  {thresholdsForYear.incisoI.decree}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-bold text-primary">
                  Art. 75, Inciso II
                </td>
                <td className="py-2.5 pr-4">
                  Compras e outros serviços em geral
                </td>
                <td className="py-2.5 pr-4 font-semibold">
                  {formatCurrency(thresholdsForYear.incisoII.limit)}
                </td>
                <td className="py-2.5 text-on-surface-variant">
                  {thresholdsForYear.incisoII.decree}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-bold text-primary">
                  Art. 75, Inciso III
                </td>
                <td className="py-2.5 pr-4">
                  Licitação deserta ou fracassada há menos de 1 ano
                </td>
                <td className="py-2.5 pr-4 font-semibold">
                  Condições do edital anterior
                </td>
                <td className="py-2.5 text-on-surface-variant">
                  Lei Federal nº 14.133/2021
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-bold text-primary">
                  Art. 75, Inciso VIII
                </td>
                <td className="py-2.5 pr-4">
                  Emergência ou calamidade pública (execução até 1 ano)
                </td>
                <td className="py-2.5 pr-4 font-semibold">
                  Parcela estritamente necessária
                </td>
                <td className="py-2.5 text-on-surface-variant">
                  Lei Federal nº 14.133/2021
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Classification Form & Validation Results */}
      <form
        onSubmit={handleSave}
        className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg space-y-lg"
      >
        <div>
          <h3 className="font-headline-sm font-bold text-on-surface">
            Enquadramento do Processo
          </h3>
          <p className="font-body-sm text-xs text-on-surface-variant">
            Selecione a hipótese legal adequada ao objeto e registre a
            fundamentação complementar.
          </p>
        </div>

        <div className="space-y-md">
          {/* Radio / Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
            {Object.values(LEGAL_HYPOTHESES).map((hypo) => {
              const isSelected = selectedHypothesis === hypo.key;
              return (
                <label
                  key={hypo.key}
                  className={`flex flex-col justify-between rounded-lg border p-md cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                      : "border-outline-variant/70 bg-surface-container-lowest hover:border-primary/40"
                  } ${!canEdit ? "opacity-90 cursor-default" : ""}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md font-bold text-primary">
                        {hypo.shortLabel}
                      </span>
                      <input
                        type="radio"
                        name="legalHypothesis"
                        value={hypo.key}
                        checked={isSelected}
                        disabled={!canEdit}
                        onChange={() => setSelectedHypothesis(hypo.key)}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                    </div>
                    <div className="font-label-md font-semibold text-on-surface">
                      {hypo.title}
                    </div>
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      {hypo.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Legal Justification Field */}
          <div>
            <label
              htmlFor="legal-justification"
              className="mb-1 block font-label-md text-on-surface"
            >
              Fundamentação Fático-Jurídica Complementar
            </label>
            <textarea
              id="legal-justification"
              rows={4}
              disabled={!canEdit}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Descreva a consonância do objeto com o dispositivo do Artigo 75 (por exemplo, motivação de urgência, histórico do certame anterior, etc.)."
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-sm font-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-surface-container-low"
            />
          </div>

          {/* Validation Panel */}
          <div className="space-y-sm rounded-lg border border-outline-variant/50 bg-surface-container-low/40 p-md">
            <h4 className="font-label-md font-bold uppercase tracking-wider text-on-surface-variant">
              Resultado da Verificação Automática
            </h4>

            {validation?.hardErrors?.length > 0 && (
              <div className="space-y-1">
                <span className="font-label-sm font-bold text-error flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">
                    cancel
                  </span>
                  Inconformidades Identificadas (Erros Impeditivos):
                </span>
                <ul className="list-disc pl-5 font-body-sm text-xs text-error space-y-1">
                  {validation.hardErrors.map((err, idx) => (
                    <li key={idx}>{err.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation?.warnings?.length > 0 && (
              <div className="space-y-1">
                <span className="font-label-sm font-bold text-tertiary flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">
                    warning
                  </span>
                  Alertas de Conformidade (Avisos):
                </span>
                <ul className="list-disc pl-5 font-body-sm text-xs text-tertiary space-y-1">
                  {validation.warnings.map((warn, idx) => (
                    <li key={idx}>{warn.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation?.isValid &&
              (!validation.warnings || validation.warnings.length === 0) && (
                <div className="flex items-center gap-1.5 font-body-sm text-xs text-primary font-semibold">
                  <span className="material-symbols-outlined text-base">
                    check_circle
                  </span>
                  Classificação em conformidade com os parâmetros objetivos de
                  enquadramento.
                </div>
              )}

            {/* Human Checklist Items */}
            {validation?.humanReviewItems?.length > 0 && (
              <div className="pt-2 border-t border-outline-variant/40 space-y-1">
                <span className="font-label-sm font-bold text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-base text-primary">
                    fact_check
                  </span>
                  Itens Obrigatórios de Verificação Humana (Não substituídos
                  pelo sistema):
                </span>
                <div className="space-y-1.5 pt-1">
                  {validation.humanReviewItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded border border-outline-variant/40 bg-surface-container-lowest p-2 text-xs"
                    >
                      <strong className="text-on-surface block">
                        {item.title}
                      </strong>
                      <span className="text-on-surface-variant block mt-0.5">
                        {item.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {canEdit && (
            <div className="flex justify-end pt-sm">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-xs rounded-lg bg-primary px-lg py-2.5 font-label-md text-on-primary hover:bg-primary-container disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">save</span>
                <span>
                  {isSaving ? "Salvando..." : "Salvar Enquadramento Legal"}
                </span>
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
