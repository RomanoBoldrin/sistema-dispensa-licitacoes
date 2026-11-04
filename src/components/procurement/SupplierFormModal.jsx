import { useState } from "react";
import {
  formatCnpj,
  isValidCnpj,
  normalizeCnpj,
} from "@/components/dashboard/dashboardUtils";

function SupplierFormContent({ onClose, onSubmit, initialData }) {
  const [legalName, setLegalName] = useState(initialData?.legalName || "");
  const [tradeName, setTradeName] = useState(initialData?.tradeName || "");
  const [cnpj, setCnpj] = useState(formatCnpj(initialData?.cnpj || ""));
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleCnpjChange = (e) => {
    const raw = e.target.value;
    const digits = normalizeCnpj(raw).slice(0, 14);
    const formatted = formatCnpj(digits);
    setCnpj(formatted);
  };

  const validate = () => {
    const newErrors = {};

    if (!legalName.trim() || legalName.trim().length < 2) {
      newErrors.legalName = "Razão social deve ter pelo menos 2 caracteres.";
    }

    if (!initialData || cnpj) {
      if (!isValidCnpj(cnpj)) {
        newErrors.cnpj = "CNPJ inválido ou dígitos verificadores incorretos.";
      }
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Formato de e-mail inválido.";
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
        legalName: legalName.trim(),
        tradeName: tradeName.trim() || null,
        cnpj: normalizeCnpj(cnpj),
        email: email.trim().toLowerCase() || null,
        phone: phone.trim() || null,
      });
      onClose();
    } catch (err) {
      setServerError(err.message || "Erro ao salvar fornecedor.");
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
            storefront
          </span>
          <h2
            id="supplier-modal-title"
            className="font-headline-sm font-bold text-on-surface"
          >
            {initialData ? "Editar Fornecedor" : "Cadastrar Novo Fornecedor"}
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
        <div>
          <label htmlFor="sup-legalName" className={labelClasses}>
            Razão Social *
          </label>
          <input
            id="sup-legalName"
            type="text"
            placeholder="Ex: Comercial Silva & Irmãos Ltda."
            className={inputClasses}
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            required
          />
          {errors.legalName && (
            <p className="mt-1 font-label-sm text-error">{errors.legalName}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
          <div>
            <label htmlFor="sup-tradeName" className={labelClasses}>
              Nome Fantasia
            </label>
            <input
              id="sup-tradeName"
              type="text"
              placeholder="Ex: Silva Distribuidora"
              className={inputClasses}
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="sup-cnpj" className={labelClasses}>
              CNPJ *
            </label>
            <input
              id="sup-cnpj"
              type="text"
              placeholder="00.000.000/0000-00"
              className={inputClasses}
              value={cnpj}
              onChange={handleCnpjChange}
              required
            />
            {errors.cnpj && (
              <p className="mt-1 font-label-sm text-error">{errors.cnpj}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
          <div>
            <label htmlFor="sup-email" className={labelClasses}>
              E-mail
            </label>
            <input
              id="sup-email"
              type="email"
              placeholder="contato@empresa.com.br"
              className={inputClasses}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && (
              <p className="mt-1 font-label-sm text-error">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="sup-phone" className={labelClasses}>
              Telefone
            </label>
            <input
              id="sup-phone"
              type="text"
              placeholder="(11) 98765-4321"
              className={inputClasses}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
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
              <span>{initialData ? "Atualizar" : "Salvar Fornecedor"}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SupplierFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
}) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="supplier-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-sm backdrop-blur-xs"
    >
      <SupplierFormContent
        key={initialData?.id || "new-supplier"}
        onClose={onClose}
        onSubmit={onSubmit}
        initialData={initialData}
      />
    </div>
  );
}
