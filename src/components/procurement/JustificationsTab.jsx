import { useState } from "react";
import {
  formatCurrency,
  formatPhone,
} from "@/components/dashboard/dashboardUtils";

export default function JustificationsTab({ processData, onUpdated }) {
  const quotations = processData?.quotations || [];
  const comparativeMap = processData?.comparativeMap;
  const permissions = processData?.permissions || {};
  const canSelectSupplier = Boolean(
    processData?.canSelectSupplier || permissions.canSelectSupplier,
  );
  const canEdit = Boolean(permissions.canEdit);

  // Supplier selection state
  const [selectedSupplierId, setSelectedSupplierId] = useState(
    processData?.selectedSupplierId || "",
  );
  const [supplierJustification, setSupplierJustification] = useState(
    processData?.supplierJustification || "",
  );
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [supplierMessage, setSupplierMessage] = useState(null);
  const [supplierError, setSupplierError] = useState(null);

  // Price justification state
  const [priceJustification, setPriceJustification] = useState(
    processData?.priceJustification || "",
  );
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [priceMessage, setPriceMessage] = useState(null);
  const [priceError, setPriceError] = useState(null);

  const selectedQuotation = quotations.find(
    (q) => q.supplierId === selectedSupplierId,
  );

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!canSelectSupplier || isSavingSupplier) return;

    if (!selectedSupplierId) {
      setSupplierError(
        "Selecione um fornecedor entre as cotações cadastradas.",
      );
      return;
    }

    setIsSavingSupplier(true);
    setSupplierError(null);
    setSupplierMessage(null);

    try {
      const response = await fetch(
        `/api/v1/processes/${processData.id}/supplier`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplierId: selectedSupplierId,
            supplierJustification: supplierJustification.trim() || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Erro ao salvar a seleção do fornecedor.",
        );
      }

      setSupplierMessage(
        "Fornecedor e justificativa da escolha salvos com sucesso!",
      );
      if (onUpdated) onUpdated();
    } catch (err) {
      setSupplierError(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!canEdit || isSavingPrice) return;

    if (!priceJustification.trim()) {
      setPriceError("A justificativa de preço é obrigatória.");
      return;
    }

    setIsSavingPrice(true);
    setPriceError(null);
    setPriceMessage(null);

    try {
      const response = await fetch(
        `/api/v1/processes/${processData.id}/justifications`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            priceJustification: priceJustification.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Erro ao salvar justificativa de preço.",
        );
      }

      setPriceMessage("Justificativa de preço salva com sucesso!");
      if (onUpdated) onUpdated();
    } catch (err) {
      setPriceError(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setIsSavingPrice(false);
    }
  };

  return (
    <div className="space-y-lg">
      {/* 1. Supplier Selection & Justification */}
      <section
        aria-labelledby="heading-supplier-selection"
        className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg space-y-md"
      >
        <div className="border-b border-outline-variant/50 pb-sm">
          <div className="flex items-center gap-xs">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-xl text-primary"
            >
              storefront
            </span>
            <h2
              id="heading-supplier-selection"
              className="font-headline-sm font-bold text-on-surface"
            >
              1. Seleção do Fornecedor e Justificativa da Escolha
            </h2>
          </div>
          <p className="mt-1 font-body-sm text-xs text-on-surface-variant">
            Aponte o fornecedor contratado a partir das cotações cadastradas e
            declare as razões técnicas, econômicas ou operacionais da escolha.
          </p>
        </div>

        {supplierMessage && (
          <div
            role="status"
            className="flex items-center gap-xs rounded-lg border border-primary/30 bg-primary/10 p-sm text-primary font-body-sm font-semibold"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-base"
            >
              check_circle
            </span>
            <span>{supplierMessage}</span>
          </div>
        )}

        {supplierError && (
          <div
            role="alert"
            className="flex items-center gap-xs rounded-lg border border-error bg-error-container p-sm text-on-error-container font-body-sm"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-base"
            >
              error
            </span>
            <span>{supplierError}</span>
          </div>
        )}

        <form onSubmit={handleSaveSupplier} className="space-y-md">
          {quotations.length === 0 ? (
            <div className="rounded-lg border border-tertiary/40 bg-tertiary-fixed/30 p-md text-on-tertiary-fixed-variant font-body-sm text-xs">
              <span className="font-semibold block">
                Nenhuma cotação cadastrada.
              </span>
              Acesse a aba <strong>Pesquisa de Preços</strong> para registrar as
              propostas de fornecedores antes de realizar a seleção.
            </div>
          ) : (
            <div>
              <label
                htmlFor="select-supplier"
                className="mb-1 block font-label-md text-on-surface"
              >
                Fornecedor Selecionado / Proposto *
              </label>
              <select
                id="select-supplier"
                disabled={!canSelectSupplier}
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 font-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-surface-container-low"
              >
                <option value="">
                  Selecione um fornecedor das cotações...
                </option>
                {quotations.map((q) => {
                  const s = q.supplier || {};
                  return (
                    <option key={q.supplierId} value={q.supplierId}>
                      {s.legalName} ({s.cnpj}) — Proposta:{" "}
                      {formatCurrency(Number(q.value))}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Selected Supplier Card Snippet */}
          {selectedQuotation && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-md space-y-xs">
              <div className="flex flex-wrap items-center justify-between gap-xs">
                <span className="font-label-md font-bold text-primary">
                  {selectedQuotation.supplier?.legalName}
                </span>
                <span className="rounded bg-primary/10 px-2 py-0.5 font-label-sm font-semibold text-primary">
                  Valor Proposto:{" "}
                  {formatCurrency(Number(selectedQuotation.value))}
                </span>
              </div>
              <div className="text-xs font-body-sm text-on-surface-variant flex flex-wrap gap-x-md gap-y-1">
                <span>
                  <strong>CNPJ:</strong> {selectedQuotation.supplier?.cnpj}
                </span>
                {selectedQuotation.supplier?.email && (
                  <span>
                    <strong>E-mail:</strong> {selectedQuotation.supplier?.email}
                  </span>
                )}
                {selectedQuotation.supplier?.phone && (
                  <span>
                    <strong>Telefone:</strong>{" "}
                    {formatPhone(selectedQuotation.supplier?.phone)}
                  </span>
                )}
              </div>
              {comparativeMap?.lowestValue && (
                <div className="text-xs font-body-sm pt-1">
                  {Number(selectedQuotation.value) ===
                  Number(comparativeMap.lowestValue) ? (
                    <span className="text-primary font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        verified
                      </span>
                      Fornecedor com a menor cotação obtida no mapa comparativo.
                    </span>
                  ) : (
                    <span className="text-tertiary flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        info
                      </span>
                      Esta proposta não é a menor do mapa (menor:{" "}
                      {formatCurrency(Number(comparativeMap.lowestValue))}). É
                      indispensável detalhar os critérios de escolha no campo
                      abaixo.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Supplier Justification */}
          <div>
            <label
              htmlFor="supplier-justification"
              className="mb-1 block font-label-md text-on-surface"
            >
              Razão da Escolha do Fornecedor *
            </label>
            <textarea
              id="supplier-justification"
              rows={4}
              disabled={!canSelectSupplier}
              value={supplierJustification}
              onChange={(e) => setSupplierJustification(e.target.value)}
              placeholder="Explique os motivos da escolha (ex.: menor preço, conformidade estrita com o Termo de Referência, capacidade técnica comprovada, prazo de atendimento, etc.)."
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-sm font-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-surface-container-low"
            />
          </div>

          {canSelectSupplier && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingSupplier || quotations.length === 0}
                className="inline-flex items-center gap-xs rounded-lg bg-primary px-lg py-2.5 font-label-md text-on-primary hover:bg-primary-container disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">check</span>
                <span>
                  {isSavingSupplier
                    ? "Salvando..."
                    : "Confirmar Seleção do Fornecedor"}
                </span>
              </button>
            </div>
          )}
        </form>
      </section>

      {/* 2. Price Justification */}
      <section
        aria-labelledby="heading-price-justification"
        className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg space-y-md"
      >
        <div className="border-b border-outline-variant/50 pb-sm">
          <div className="flex items-center gap-xs">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-xl text-primary"
            >
              payments
            </span>
            <h2
              id="heading-price-justification"
              className="font-headline-sm font-bold text-on-surface"
            >
              2. Justificativa de Preço
            </h2>
          </div>
          <p className="mt-1 font-body-sm text-xs text-on-surface-variant">
            Demonstre a conformidade e a razoabilidade do preço
            estimado/contratado com os parâmetros de mercado praticados (Art. 23
            e Art. 75 da Lei nº 14.133/2021).
          </p>
        </div>

        {priceMessage && (
          <div
            role="status"
            className="flex items-center gap-xs rounded-lg border border-primary/30 bg-primary/10 p-sm text-primary font-body-sm font-semibold"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-base"
            >
              check_circle
            </span>
            <span>{priceMessage}</span>
          </div>
        )}

        {priceError && (
          <div
            role="alert"
            className="flex items-center gap-xs rounded-lg border border-error bg-error-container p-sm text-on-error-container font-body-sm"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-base"
            >
              error
            </span>
            <span>{priceError}</span>
          </div>
        )}

        {/* Financial Metrics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-xs sm:gap-sm">
          <div className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-sm">
            <span className="font-label-sm text-on-surface-variant block">
              Valor Estimado
            </span>
            <strong className="font-headline-sm text-on-surface block mt-0.5">
              {formatCurrency(processData?.estimatedValue)}
            </strong>
          </div>
          <div className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-sm">
            <span className="font-label-sm text-on-surface-variant block">
              Cotações Obtidas
            </span>
            <strong className="font-headline-sm text-on-surface block mt-0.5">
              {quotations.length}
            </strong>
          </div>
          <div className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-sm">
            <span className="font-label-sm text-on-surface-variant block">
              Menor Cotação
            </span>
            <strong className="font-headline-sm text-primary block mt-0.5">
              {comparativeMap?.lowestQuotation
                ? formatCurrency(Number(comparativeMap.lowestQuotation.value))
                : "—"}
            </strong>
          </div>
          <div className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-sm">
            <span className="font-label-sm text-on-surface-variant block">
              Média das Cotações
            </span>
            <strong className="font-headline-sm text-on-surface block mt-0.5">
              {comparativeMap?.averageValue
                ? formatCurrency(Number(comparativeMap.averageValue))
                : "—"}
            </strong>
          </div>
        </div>

        <form onSubmit={handleSavePrice} className="space-y-md">
          <div>
            <label
              htmlFor="price-justification"
              className="mb-1 block font-label-md text-on-surface"
            >
              Justificativa de Preço da Contratação *
            </label>
            <textarea
              id="price-justification"
              rows={4}
              disabled={!canEdit}
              value={priceJustification}
              onChange={(e) => setPriceJustification(e.target.value)}
              placeholder="Fundamente por que o preço contratado é justo e condizente com a realidade de mercado, citando a pesquisa de preços realizada, orçamentos e metodologia adotada."
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-sm font-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-surface-container-low"
            />
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingPrice}
                className="inline-flex items-center gap-xs rounded-lg bg-primary px-lg py-2.5 font-label-md text-on-primary hover:bg-primary-container disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">save</span>
                <span>
                  {isSavingPrice
                    ? "Salvando..."
                    : "Salvar Justificativa de Preço"}
                </span>
              </button>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
