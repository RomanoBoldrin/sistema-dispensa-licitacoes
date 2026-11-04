import { useState } from "react";
import ComparativePriceMap from "./ComparativePriceMap";
import QuotationFormModal from "./QuotationFormModal";
import SupplierFormModal from "./SupplierFormModal";

export default function PriceResearchTab({
  processId,
  quotations = [],
  comparativeMap = null,
  suppliers = [],
  canManage,
  onQuotationCreated,
  onQuotationUpdated,
  onQuotationDeleted,
  onSupplierCreated,
}) {
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  const handleOpenAdd = () => {
    setEditingQuotation(null);
    setIsQuotationModalOpen(true);
  };

  const handleOpenEdit = (quotationItem) => {
    setEditingQuotation(quotationItem);
    setIsQuotationModalOpen(true);
  };

  const handleSaveQuotation = async (formData) => {
    const isEdit = Boolean(editingQuotation);
    const url = isEdit
      ? `/api/v1/processes/${processId}/quotations/${editingQuotation.id}`
      : `/api/v1/processes/${processId}/quotations`;

    const response = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Erro ao salvar cotação.");
    }

    if (isEdit && onQuotationUpdated) {
      onQuotationUpdated(data);
    } else if (!isEdit && onQuotationCreated) {
      onQuotationCreated(data);
    }
  };

  const handleDeleteQuotation = async (quotationId) => {
    if (!confirm("Deseja realmente remover esta cotação do processo?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/processes/${processId}/quotations/${quotationId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Erro ao excluir cotação.");
      }

      if (onQuotationDeleted) {
        onQuotationDeleted(quotationId);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveSupplier = async (supplierData) => {
    const response = await fetch("/api/v1/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supplierData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Erro ao cadastrar fornecedor.");
    }

    if (onSupplierCreated) {
      onSupplierCreated(data);
    }
  };

  return (
    <div className="space-y-md">
      {/* Header with actions */}
      <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-headline-sm font-bold text-on-surface">
            Pesquisa de Preços
          </h2>
          <p className="font-body-sm text-xs text-on-surface-variant">
            Registro das propostas comerciais recebidas de fornecedores e mapa
            comparativo.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-xs rounded-lg bg-primary px-md py-2 font-label-md font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-base"
            >
              add
            </span>
            <span>Adicionar Cotação</span>
          </button>
        )}
      </div>

      {/* Comparative Price Map Component */}
      <ComparativePriceMap
        mapData={comparativeMap}
        onEditQuotation={handleOpenEdit}
        onDeleteQuotation={handleDeleteQuotation}
        canManage={canManage}
      />

      {/* Quotation Form Modal */}
      <QuotationFormModal
        isOpen={isQuotationModalOpen}
        onClose={() => setIsQuotationModalOpen(false)}
        onSubmit={handleSaveQuotation}
        initialData={editingQuotation}
        suppliers={suppliers}
        onOpenSupplierModal={() => setIsSupplierModalOpen(true)}
      />

      {/* Supplier Modal */}
      <SupplierFormModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSubmit={handleSaveSupplier}
      />
    </div>
  );
}
