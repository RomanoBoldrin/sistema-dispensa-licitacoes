import { useState } from "react";

function QuotationFormContent({
  onClose,
  onSubmit,
  initialData,
  suppliers = [],
  onOpenSupplierModal,
}) {
  const [supplierId, setSupplierId] = useState(
    initialData?.supplierId || initialData?.supplier?.id || "",
  );
  const [value, setValue] = useState(initialData?.value || "");
  const [quotedAt, setQuotedAt] = useState(
    initialData?.quotedAt
      ? initialData.quotedAt.split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const validate = () => {
    const newErrors = {};
    if (!initialData && !supplierId) {
      newErrors.supplierId = "Selecione um fornecedor.";
    }

    const numValue = Number(String(value).replace(",", "."));
    if (!value || isNaN(numValue) || numValue <= 0) {
      newErrors.value = "Informe um valor monetário positivo.";
    }

    if (quotedAt) {
      const d = new Date(quotedAt);
      if (isNaN(d.getTime())) {
        newErrors.quotedAt = "Data inválida.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      await onSubmit({
        supplierId,
        value: String(value).replace(",", "."),
        quotedAt: quotedAt || null,
        description: description.trim() || null,
      });
      onClose();
    } catch (err) {
      setServerError(err.message || "Erro ao salvar cotação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses =
    "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-2 font-body-sm text-on-surface placeholder:text-outline transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const labelClasses = "block font-label-sm font-semibold text-on-surface mb-1";

  return (
    <div className="w-full max-w-lg rounded-2xl border border-outline-variant/80 bg-surface-container-lowest p-md shadow-xl sm:p-lg">
      <div className="flex items-center justify-between border-b border-outline-variant/50 pb-sm">
        <div className="flex items-center gap-xs">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-xl text-primary"
          >
            request_quote
          </span>
          <h2
            id="quotation-modal-title"
            className="font-headline-sm font-bold text-on-surface"
          >
            {initialData ? "Editar Cotação" : "Adicionar Cotação de Preço"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal"
          className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-base"
          >
            close
          </span>
        </button>
      </div>

      {serverError && (
        <div
          role="alert"
          className="mt-sm flex items-start gap-xs rounded-lg border border-error/30 bg-error/10 p-sm font-body-sm text-on-error-container"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-base text-error"
          >
            error
          </span>
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-md space-y-sm">
        {!initialData ? (
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="quote-supplier" className={labelClasses}>
                Fornecedor *
              </label>
              {onOpenSupplierModal && (
                <button
                  type="button"
                  onClick={onOpenSupplierModal}
                  className="font-label-sm font-semibold text-primary hover:underline"
                >
                  + Cadastrar fornecedor
                </button>
              )}
            </div>
            <select
              id="quote-supplier"
              className={inputClasses}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
            >
              <option value="">Selecione um fornecedor...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.legalName} ({s.formattedCnpj || s.cnpj})
                </option>
              ))}
            </select>
            {errors.supplierId && (
              <p className="mt-1 font-label-sm text-error">
                {errors.supplierId}
              </p>
            )}
          </div>
        ) : (
          <div>
            <span className={labelClasses}>Fornecedor</span>
            <p className="rounded-lg bg-surface-container-low px-sm py-2 font-body-sm font-semibold text-on-surface">
              {initialData.supplier?.legalName} (
              {initialData.supplier?.formattedCnpj ||
                initialData.supplier?.cnpj}
              )
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
          <div>
            <label htmlFor="quote-value" className={labelClasses}>
              Valor Total Proposto (R$) *
            </label>
            <input
              id="quote-value"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Ex: 15450.00"
              className={inputClasses}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
            {errors.value && (
              <p className="mt-1 font-label-sm text-error">{errors.value}</p>
            )}
          </div>

          <div>
            <label htmlFor="quote-date" className={labelClasses}>
              Data da Cotação
            </label>
            <input
              id="quote-date"
              type="date"
              className={inputClasses}
              value={quotedAt}
              onChange={(e) => setQuotedAt(e.target.value)}
            />
            {errors.quotedAt && (
              <p className="mt-1 font-label-sm text-error">{errors.quotedAt}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="quote-desc" className={labelClasses}>
            Descrição / Observações da Proposta
          </label>
          <textarea
            id="quote-desc"
            rows={3}
            placeholder="Ex: Proposta com garantia estendida de 12 meses e frete incluso."
            className={inputClasses}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-xs border-t border-outline-variant/50 pt-md">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-md py-2 font-label-md text-on-surface transition-colors hover:bg-surface-container-high"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-xs rounded-lg bg-primary px-md py-2 font-label-md font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined animate-spin text-base"
                >
                  progress_activity
                </span>
                <span>Salvando...</span>
              </>
            ) : (
              <span>{initialData ? "Atualizar" : "Salvar Cotação"}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function QuotationFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  suppliers = [],
  onOpenSupplierModal,
}) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quotation-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-sm backdrop-blur-xs"
    >
      <QuotationFormContent
        key={initialData?.id || "new-quotation"}
        onClose={onClose}
        onSubmit={onSubmit}
        initialData={initialData}
        suppliers={suppliers}
        onOpenSupplierModal={onOpenSupplierModal}
      />
    </div>
  );
}
