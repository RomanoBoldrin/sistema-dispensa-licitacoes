import { useState } from "react";
import { formatPhone } from "@/components/dashboard/dashboardUtils";
import SupplierFormModal from "./SupplierFormModal";

export default function SupplierManagementTab({
  suppliers = [],
  userRole,
  onSupplierSaved,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const canManage = userRole === "ADMIN" || userRole === "AGENTE_CONTRATACAO";

  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.legalName?.toLowerCase().includes(term) ||
      s.tradeName?.toLowerCase().includes(term) ||
      s.cnpj?.includes(term.replace(/\D/g, ""))
    );
  });

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (formData) => {
    const isEdit = Boolean(editingSupplier);
    const url = isEdit
      ? `/api/v1/suppliers/${editingSupplier.id}`
      : "/api/v1/suppliers";

    const response = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Erro ao salvar fornecedor.");
    }

    if (onSupplierSaved) {
      onSupplierSaved(data, isEdit);
    }
  };

  return (
    <div className="space-y-md">
      {/* Header and Search */}
      <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-headline-sm font-bold text-on-surface">
            Fornecedores
          </h2>
          <p className="font-body-sm text-xs text-on-surface-variant">
            Consulta e cadastro de fornecedores aptos a fornecer orçamentos.
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
              person_add
            </span>
            <span>Cadastrar Fornecedor</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-sm">
        <div className="relative">
          <span
            aria-hidden="true"
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline"
          >
            search
          </span>
          <input
            type="text"
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-sm font-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="overflow-hidden rounded-xl border border-outline-variant/70 bg-surface-container-lowest">
        <div className="border-b border-outline-variant/50 bg-surface-container-low/40 px-md py-sm">
          <h3 className="font-label-md font-bold text-on-surface">
            Fornecedores Registrados ({filteredSuppliers.length})
          </h3>
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="p-lg text-center font-body-sm text-on-surface-variant">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-4xl text-outline"
            >
              store_mall_directory
            </span>
            <p className="mt-xs">
              {searchTerm
                ? "Nenhum fornecedor encontrado para a busca informada."
                : "Nenhum fornecedor cadastrado no sistema."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm">
              <thead className="border-b border-outline-variant/50 bg-surface-container-low font-label-sm uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th scope="col" className="px-md py-3 font-semibold">
                    Razão Social / Nome Fantasia
                  </th>
                  <th scope="col" className="px-md py-3 font-semibold">
                    CNPJ
                  </th>
                  <th scope="col" className="px-md py-3 font-semibold">
                    Contato
                  </th>
                  <th
                    scope="col"
                    className="px-md py-3 text-center font-semibold"
                  >
                    Cotações
                  </th>
                  {canManage && (
                    <th
                      scope="col"
                      className="px-md py-3 text-center font-semibold"
                    >
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {filteredSuppliers.map((sup) => (
                  <tr
                    key={sup.id}
                    className="transition-colors hover:bg-surface-container-low/30"
                  >
                    <td className="px-md py-3">
                      <p className="font-semibold text-on-surface">
                        {sup.legalName}
                      </p>
                      {sup.tradeName && (
                        <p className="text-xs text-on-surface-variant">
                          Fantasia: {sup.tradeName}
                        </p>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-md py-3 font-mono text-xs text-on-surface">
                      {sup.formattedCnpj || sup.cnpj}
                    </td>

                    <td className="px-md py-3 text-xs text-on-surface-variant">
                      {sup.email && <p>{sup.email}</p>}
                      {sup.phone && <p>{formatPhone(sup.phone)}</p>}
                      {!sup.email && !sup.phone && <p>—</p>}
                    </td>

                    <td className="whitespace-nowrap px-md py-3 text-center font-semibold text-on-surface">
                      {sup.quotationCount ?? sup._count?.quotations ?? 0}
                    </td>

                    {canManage && (
                      <td className="whitespace-nowrap px-md py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(sup)}
                          title="Editar fornecedor"
                          className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                        >
                          <span
                            aria-hidden="true"
                            className="material-symbols-outlined text-base"
                          >
                            edit
                          </span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier Modal */}
      <SupplierFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveSupplier}
        initialData={editingSupplier}
      />
    </div>
  );
}
