import { useState } from "react";
import {
  formatDateTime,
  ALLOWED_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
} from "@/components/dashboard/dashboardUtils";

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function DocumentManagementTab({
  processId,
  documents = [],
  canManage,
  onDocumentUploaded,
  onDocumentDeleted,
}) {
  const [selectedType, setSelectedType] = useState("TERMO_REFERENCIA");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  const attachedTypes = new Set(documents.map((d) => d.type));

  const checklistItems = [
    { type: "TERMO_REFERENCIA", label: "Termo de Referência (TR)" },
    { type: "PESQUISA_PRECOS", label: "Pesquisa de Preços" },
    {
      type: "DOCUMENTACAO_FORNECEDOR",
      label: "Documentação do Fornecedor",
    },
    { type: "JUSTIFICATIVA_PRECO", label: "Justificativa de Preço" },
    {
      type: "RAZAO_ESCOLHA_FORNECEDOR",
      label: "Razão da Escolha do Fornecedor",
    },
    { type: "PARECER_JURIDICO", label: "Parecer Jurídico" },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setSelectedFile(file || null);
    setUploadError(null);
    setUploadSuccess(null);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Selecione um arquivo para anexar.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", selectedType);

      const response = await fetch(`/api/v1/processes/${processId}/documents`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Erro ao realizar upload do documento.",
        );
      }

      setUploadSuccess(`Documento '${data.filename}' anexado com sucesso!`);
      setSelectedFile(null);
      // Reset input element
      const inputEl = document.getElementById("doc-file-input");
      if (inputEl) inputEl.value = "";

      if (onDocumentUploaded) {
        onDocumentUploaded(data);
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId, filename) => {
    if (
      !confirm(
        `Deseja realmente desativar o documento '${filename}' deste processo?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/processes/${processId}/documents/${documentId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Erro ao remover documento.");
      }

      if (onDocumentDeleted) {
        onDocumentDeleted(documentId);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-lg">
      {/* Document Checklist */}
      <section
        aria-labelledby="checklist-heading"
        className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg"
      >
        <div className="mb-sm flex items-center justify-between border-b border-outline-variant/50 pb-xs">
          <div className="flex items-center gap-xs">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-xl text-primary"
            >
              checklist
            </span>
            <h3
              id="checklist-heading"
              className="font-headline-sm font-bold text-on-surface"
            >
              Checklist de Documentos Processuais
            </h3>
          </div>
          <span className="font-label-sm text-on-surface-variant">
            {checklistItems.filter((i) => attachedTypes.has(i.type)).length} de{" "}
            {checklistItems.length} tipos anexados
          </span>
        </div>

        <div className="grid grid-cols-1 gap-xs sm:grid-cols-2 lg:grid-cols-3">
          {checklistItems.map((item) => {
            const isAttached = attachedTypes.has(item.type);
            return (
              <div
                key={item.type}
                className={`flex items-center gap-xs rounded-lg border p-2.5 transition-colors ${
                  isAttached
                    ? "border-primary/30 bg-primary/5 text-on-surface"
                    : "border-outline-variant/40 bg-surface-container-low/30 text-on-surface-variant"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-lg ${
                    isAttached ? "text-primary font-bold" : "text-outline"
                  }`}
                >
                  {isAttached ? "check_circle" : "radio_button_unchecked"}
                </span>
                <div className="text-xs">
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-[11px] text-outline">
                    {isAttached ? "Anexado" : "Pendente"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Upload Box (Only if canManage) */}
      {canManage && (
        <section
          aria-labelledby="upload-heading"
          className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg"
        >
          <div className="mb-sm flex items-center gap-xs border-b border-outline-variant/50 pb-xs">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-xl text-primary"
            >
              upload_file
            </span>
            <h3
              id="upload-heading"
              className="font-headline-sm font-bold text-on-surface"
            >
              Anexar Novo Documento
            </h3>
          </div>

          {uploadSuccess && (
            <div
              role="status"
              className="mb-sm flex items-center gap-xs rounded-lg border border-primary/30 bg-primary/10 p-sm font-body-sm text-primary"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-base"
              >
                check_circle
              </span>
              <span>{uploadSuccess}</span>
            </div>
          )}

          {uploadError && (
            <div
              role="alert"
              className="mb-sm flex items-center gap-xs rounded-lg border border-error/30 bg-error/10 p-sm font-body-sm text-on-error-container"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-base text-error"
              >
                error
              </span>
              <span>{uploadError}</span>
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-sm">
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
              <div>
                <label
                  htmlFor="doc-type-select"
                  className="block font-label-sm font-semibold text-on-surface mb-1"
                >
                  Tipo de Documento *
                </label>
                <select
                  id="doc-type-select"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-2 font-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  {ALLOWED_DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {DOCUMENT_TYPE_LABELS[type] || type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="doc-file-input"
                  className="block font-label-sm font-semibold text-on-surface mb-1"
                >
                  Arquivo (PDF, PNG, JPEG, DOCX, XLSX, TXT até 15MB) *
                </label>
                <input
                  id="doc-file-input"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.doc,.odt,.txt"
                  className="w-full text-xs font-body-sm file:mr-3 file:rounded-md file:border-0 file:bg-surface-container-high file:px-sm file:py-2 file:font-label-sm file:font-semibold file:text-on-surface hover:file:bg-primary hover:file:text-on-primary"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-xs">
              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="inline-flex items-center gap-xs rounded-lg bg-primary px-md py-2 font-label-md font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined animate-spin text-base"
                    >
                      progress_activity
                    </span>
                    <span>Enviando arquivo...</span>
                  </>
                ) : (
                  <>
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-base"
                    >
                      upload
                    </span>
                    <span>Anexar Documento</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Uploaded Documents List */}
      <section
        aria-labelledby="documents-list-heading"
        className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest"
      >
        <div className="border-b border-outline-variant/50 bg-surface-container-low/40 px-md py-sm">
          <h3
            id="documents-list-heading"
            className="font-headline-sm font-bold text-on-surface"
          >
            Documentos Anexados ao Processo ({documents.length})
          </h3>
        </div>

        {documents.length === 0 ? (
          <div className="p-lg text-center font-body-sm text-on-surface-variant">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-4xl text-outline"
            >
              folder_off
            </span>
            <p className="mt-xs">
              Nenhum documento anexado a este processo até o momento.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm">
              <thead className="border-b border-outline-variant/50 bg-surface-container-low font-label-sm uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th scope="col" className="px-md py-3 font-semibold">
                    Documento / Nome
                  </th>
                  <th scope="col" className="px-md py-3 font-semibold">
                    Tipo
                  </th>
                  <th scope="col" className="px-md py-3 font-semibold">
                    Tamanho
                  </th>
                  <th scope="col" className="px-md py-3 font-semibold">
                    Enviado por
                  </th>
                  <th scope="col" className="px-md py-3 font-semibold">
                    Data
                  </th>
                  <th
                    scope="col"
                    className="px-md py-3 text-center font-semibold"
                  >
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="transition-colors hover:bg-surface-container-low/30"
                  >
                    <td className="px-md py-3 font-medium text-on-surface">
                      <div className="flex items-center gap-xs">
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined text-lg text-primary"
                        >
                          description
                        </span>
                        <span className="truncate max-w-xs">
                          {doc.filename}
                        </span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-md py-3">
                      <span className="rounded bg-surface-container-high px-2 py-0.5 text-xs font-semibold text-on-surface-variant">
                        {doc.typeLabel ||
                          DOCUMENT_TYPE_LABELS[doc.type] ||
                          doc.type}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-md py-3 text-xs text-on-surface-variant">
                      {formatFileSize(doc.size)}
                    </td>

                    <td className="whitespace-nowrap px-md py-3 text-xs text-on-surface-variant">
                      {doc.uploadedBy?.name || "Usuário"}
                    </td>

                    <td className="whitespace-nowrap px-md py-3 text-xs text-on-surface-variant">
                      {formatDateTime(doc.createdAt)}
                    </td>

                    <td className="whitespace-nowrap px-md py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <a
                          href={`/api/v1/processes/${processId}/documents/${doc.id}`}
                          download
                          title="Baixar documento"
                          className="inline-flex items-center gap-1 rounded border border-outline-variant bg-surface-container-low px-2 py-1 text-xs font-semibold text-on-surface transition-colors hover:border-primary hover:text-primary"
                        >
                          <span
                            aria-hidden="true"
                            className="material-symbols-outlined text-sm"
                          >
                            download
                          </span>
                          <span>Baixar</span>
                        </a>

                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id, doc.filename)}
                            title="Desativar documento"
                            className="rounded p-1 text-on-surface-variant hover:bg-error/10 hover:text-error"
                          >
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined text-base"
                            >
                              delete
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
