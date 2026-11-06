import { useState, useEffect } from "react";
import {
  formatDate,
  formatDateTime,
  PUBLICATION_TYPE_LABELS,
} from "@/components/dashboard/dashboardUtils";

export default function PublicationTab({
  processId,
  processData,
  user,
  onActionSuccess,
}) {
  const [publications, setPublications] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError, setListError] = useState(null);

  // Form states
  const [publicationType, setPublicationType] = useState("DIRECT_AWARD_NOTICE");
  const [destination, setDestination] = useState("");
  const [publishedAt, setPublishedAt] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [referenceNumber, setReferenceNumber] = useState("");
  const [url, setUrl] = useState("");
  const [documentId, setDocumentId] = useState("");

  // Direct upload helper within publication form
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadDocError, setUploadDocError] = useState(null);
  const [newlyUploadedDocs, setNewlyUploadedDocs] = useState([]);
  const availableDocs = [
    ...newlyUploadedDocs,
    ...(processData?.documents || []),
  ];

  // Confirmation modal
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const status = processData?.status;
  const isAwaitingPublication = status === "AWAITING_PUBLICATION";
  const isCompleted = status === "COMPLETED";

  const isAgent = user?.role === "AGENTE_CONTRATACAO";
  const isSameDepartment =
    user?.departmentId && user?.departmentId === processData?.departmentId;
  const isRequester =
    processData?.requesterId === user?.id ||
    processData?.requester?.id === user?.id ||
    processData?.userId === user?.id;

  const canRegister =
    isAwaitingPublication && isAgent && isSameDepartment && !isRequester;

  useEffect(() => {
    let isMounted = true;

    async function fetchPublications() {
      if (!processId) return;
      setIsLoadingList(true);
      setListError(null);

      try {
        const res = await fetch(`/api/v1/processes/${processId}/publications`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.message || "Erro ao consultar histórico de publicações.",
          );
        }

        if (isMounted) {
          setPublications(data.publications || []);
        }
      } catch (err) {
        if (isMounted) {
          setListError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoadingList(false);
        }
      }
    }

    fetchPublications();

    return () => {
      isMounted = false;
    };
  }, [processId, status, refreshTrigger]);

  const reloadPublications = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Handle uploading supporting document directly
  const handleUploadSupportingDoc = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadDocError("Selecione um arquivo PDF ou imagem.");
      return;
    }

    setIsUploadingDoc(true);
    setUploadDocError(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("type", "OUTRO");

      const res = await fetch(`/api/v1/processes/${processId}/documents`, {
        method: "POST",
        body: formData,
      });

      const docData = await res.json();

      if (!res.ok) {
        throw new Error(docData.message || "Falha ao anexar documento.");
      }

      setNewlyUploadedDocs((prev) => [docData, ...prev]);
      setDocumentId(docData.id);
      setShowUploadModal(false);
      setUploadFile(null);
    } catch (err) {
      setUploadDocError(err.message);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Open confirmation
  const handleStartSubmit = (e) => {
    e.preventDefault();
    setFormError(null);

    if (!publicationType) {
      setFormError("Selecione o tipo de publicação.");
      return;
    }
    if (!destination.trim()) {
      setFormError("Informe o veículo/meio de publicação.");
      return;
    }
    if (!publishedAt) {
      setFormError("Informe a data da publicação.");
      return;
    }

    setIsConfirming(true);
  };

  // Confirm publication registration
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        publicationType,
        destination: destination.trim(),
        publishedAt: new Date(publishedAt).toISOString(),
        referenceNumber: referenceNumber.trim() || undefined,
        url: url.trim() || undefined,
        documentId: documentId || undefined,
      };

      const res = await fetch(`/api/v1/processes/${processId}/publications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Erro ao registrar publicação.");
      }

      setFormSuccess(
        "Publicação registrada com sucesso! O processo foi marcado como CONCLUÍDO.",
      );
      setIsConfirming(false);
      reloadPublications();

      if (onActionSuccess) {
        onActionSuccess("Publicação registrada e processo concluído!");
      }
    } catch (err) {
      setFormError(err.message || "Falha ao registrar publicação.");
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-md">
      {/* Simulation / Academic Nature Alert */}
      <div className="rounded-xl border border-secondary/30 bg-secondary-container/30 p-md text-on-secondary-container">
        <div className="flex items-start gap-sm">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-2xl text-secondary"
          >
            school
          </span>
          <div className="space-y-1 font-body-sm">
            <p className="font-title-sm font-bold">
              Simulação Didático-Acadêmica de Publicidade Oficial
            </p>
            <p className="text-xs">
              Esta aplicação simula o rito de publicação exigido pelo regime de
              contratações públicas brasileiras (Lei nº 14.133/2021). Os
              registros abaixo possuem caráter documental interno no sistema e{" "}
              <strong>
                não representam publicação em diários oficiais externos
              </strong>{" "}
              nem realizam integração automatizada com o Portal Nacional de
              Contratações Públicas (PNCP).
            </p>
          </div>
        </div>
      </div>

      {formSuccess && (
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
          {formSuccess}
        </div>
      )}

      {/* Process Status Callout: Completed */}
      {isCompleted && (
        <div className="rounded-xl border border-primary/30 bg-primary-fixed/20 p-md text-on-primary-fixed-variant">
          <div className="flex items-center gap-sm">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-2xl text-primary"
            >
              task_alt
            </span>
            <div>
              <p className="font-label-md font-bold text-on-surface">
                Procedimento de Dispensa Concluído (COMPLETED)
              </p>
              <p className="text-xs text-on-surface-variant">
                O ciclo da dispensa de licitação foi finalizado com o registro
                oficial da publicação comprobatória. O histórico do processo
                está arquivado para fins de controle e transparência.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Publication Registration Form (for eligible AGENTE_CONTRATACAO in AWAITING_PUBLICATION) */}
      {isAwaitingPublication && (
        <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg">
          <div className="border-b border-outline-variant/40 pb-sm">
            <span className="inline-flex items-center gap-1 rounded bg-secondary-container px-2 py-0.5 font-label-sm font-bold text-on-secondary-container">
              Fase 5.3 — Publicidade
            </span>
            <h2 className="mt-1 flex items-center gap-xs font-headline-sm font-bold text-on-surface">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-primary"
              >
                campaign
              </span>
              Registro de Publicação Oficial da Dispensa
            </h2>
            <p className="mt-0.5 font-body-sm text-on-surface-variant">
              Informe os dados do ato de publicação do aviso ou extrato de
              contratação direta para formalizar a conclusão do processo.
            </p>
          </div>

          {canRegister ? (
            <form onSubmit={handleStartSubmit} className="mt-md space-y-md">
              <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                {/* 1. Tipo de Publicação */}
                <div>
                  <label
                    htmlFor="pub-type"
                    className="block font-label-md font-semibold text-on-surface mb-1"
                  >
                    Tipo de Publicação *
                  </label>
                  <select
                    id="pub-type"
                    value={publicationType}
                    onChange={(e) => setPublicationType(e.target.value)}
                    required
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {Object.entries(PUBLICATION_TYPE_LABELS).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                {/* 2. Veículo de Publicação */}
                <div>
                  <label
                    htmlFor="pub-destination"
                    className="block font-label-md font-semibold text-on-surface mb-1"
                  >
                    Veículo de Publicação *
                  </label>
                  <input
                    id="pub-destination"
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Ex: Diário Oficial do Município, PNCP (Simulado), Mural Oficial"
                    required
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* 3. Data da Publicação */}
                <div>
                  <label
                    htmlFor="pub-date"
                    className="block font-label-md font-semibold text-on-surface mb-1"
                  >
                    Data da Publicação *
                  </label>
                  <input
                    id="pub-date"
                    type="date"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    required
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* 4. Número de Referência */}
                <div>
                  <label
                    htmlFor="pub-ref"
                    className="block font-label-md font-semibold text-on-surface mb-1"
                  >
                    Número de Referência / Ato (Opcional)
                  </label>
                  <input
                    id="pub-ref"
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Ex: Edição nº 1.482, pág. 45 / Extrato nº 012/2026"
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* 5. URL da Publicação */}
              <div>
                <label
                  htmlFor="pub-url"
                  className="block font-label-md font-semibold text-on-surface mb-1"
                >
                  URL da Publicação Externa (Opcional)
                </label>
                <input
                  id="pub-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://diariooficial.municipio.gov.br/atos/2026/012"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* 6. Documento Comprobatório */}
              <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-md">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm mb-2">
                  <label
                    htmlFor="pub-doc"
                    className="block font-label-md font-semibold text-on-surface"
                  >
                    Documento Comprobatório da Publicação (Opcional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-sm"
                    >
                      upload_file
                    </span>
                    Fazer upload de novo comprovante
                  </button>
                </div>

                <select
                  id="pub-doc"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Nenhum documento vinculado</option>
                  {availableDocs.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename} ({doc.type || "Documento"})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-outline">
                  Você pode selecionar um arquivo já anexado ao processo ou
                  enviar um novo PDF/comprovante.
                </p>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-md bg-error-container p-sm text-xs font-semibold text-on-error-container"
                >
                  {formError}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-xs rounded-lg bg-primary px-lg py-2.5 font-label-md font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-lg"
                  >
                    publish
                  </span>
                  Registrar Publicação & Concluir Processo
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-md rounded-lg border border-outline-variant/40 bg-surface-container-low p-md text-sm text-outline">
              {isRequester
                ? "Segregação de Funções: O solicitante da demanda não pode registrar a publicação oficial."
                : !isSameDepartment
                  ? "Acesso restrito ao Agente de Contratação do departamento responsável."
                  : !isAgent
                    ? "Apenas o Agente de Contratação pode registrar a publicação deste processo."
                    : "Aguardando deliberação de autorização."}
            </div>
          )}
        </div>
      )}

      {/* Publication History List (Read-Only) */}
      <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-md sm:p-lg">
        <div className="flex items-center justify-between border-b border-outline-variant/40 pb-sm">
          <div>
            <h3 className="flex items-center gap-xs font-title-md font-bold text-on-surface">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-primary"
              >
                history_edu
              </span>
              Histórico de Publicações Registradas no Sistema
            </h3>
            <p className="text-xs text-on-surface-variant">
              Registros imutáveis e auditáveis de publicação (somente leitura).
            </p>
          </div>

          <button
            type="button"
            onClick={reloadPublications}
            disabled={isLoadingList}
            className="flex h-8 w-8 items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
            title="Atualizar publicações"
          >
            <span
              aria-hidden="true"
              className={`material-symbols-outlined text-base ${isLoadingList ? "animate-spin" : ""}`}
            >
              refresh
            </span>
          </button>
        </div>

        {listError && (
          <div
            role="alert"
            className="mt-md rounded-md bg-error-container p-sm text-xs font-semibold text-on-error-container"
          >
            {listError}
          </div>
        )}

        {isLoadingList ? (
          <div className="py-lg text-center text-xs text-outline">
            Carregando registros de publicação...
          </div>
        ) : publications.length === 0 ? (
          <div className="py-lg text-center font-body-sm text-outline italic">
            Nenhuma publicação registrada para este processo até o momento.
          </div>
        ) : (
          <div className="mt-md space-y-md">
            {publications.map((pub) => (
              <div
                key={pub.id}
                className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-xs border-b border-outline-variant/30 pb-xs">
                  <div className="flex items-center gap-xs">
                    <span className="rounded bg-secondary-container px-2 py-0.5 text-xs font-bold text-on-secondary-container">
                      {PUBLICATION_TYPE_LABELS[pub.publicationType] ||
                        pub.publicationType}
                    </span>
                    <span className="font-semibold text-sm text-on-surface">
                      {pub.destination}
                    </span>
                  </div>

                  <span className="text-xs text-on-surface-variant">
                    Publicado em: <strong>{formatDate(pub.publishedAt)}</strong>
                  </span>
                </div>

                <div className="mt-sm grid grid-cols-1 gap-xs text-xs sm:grid-cols-2">
                  {pub.referenceNumber && (
                    <div>
                      <span className="text-outline">Referência / Edição:</span>
                      <p className="font-medium text-on-surface">
                        {pub.referenceNumber}
                      </p>
                    </div>
                  )}

                  {pub.url && (
                    <div>
                      <span className="text-outline">Link da Publicação:</span>
                      <p>
                        <a
                          href={pub.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline break-all"
                        >
                          {pub.url}
                          <span
                            aria-hidden="true"
                            className="material-symbols-outlined text-xs"
                          >
                            open_in_new
                          </span>
                        </a>
                      </p>
                    </div>
                  )}

                  {pub.document && (
                    <div>
                      <span className="text-outline">Documento Vinculado:</span>
                      <p>
                        <a
                          href={`/api/v1/processes/${processId}/documents/${pub.document.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                        >
                          <span
                            aria-hidden="true"
                            className="material-symbols-outlined text-xs"
                          >
                            attachment
                          </span>
                          {pub.document.filename}
                        </a>
                      </p>
                    </div>
                  )}

                  <div className="sm:text-right">
                    <span className="text-outline">Registrado no Sistema:</span>
                    <p className="text-on-surface">
                      {formatDateTime(pub.createdAt)} por{" "}
                      <span className="font-semibold">
                        {pub.createdBy?.name || "Agente de Contratação"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal: Completion Alert */}
      {isConfirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pub-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-md backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-xl">
            <h3
              id="pub-confirm-title"
              className="flex items-center gap-xs font-title-lg font-bold text-on-surface"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-primary"
              >
                verified
              </span>
              Confirmar Publicação & Conclusão do Processo
            </h3>

            <div className="mt-2 space-y-sm text-sm text-on-surface-variant">
              <p>
                Você está registrando a publicação oficial da contratação direta
                no veículo: <strong>{destination}</strong> (Data:{" "}
                <strong>{formatDate(publishedAt)}</strong>).
              </p>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-sm text-xs text-on-surface">
                <p className="font-bold text-primary">
                  Atenção — Conclusão Irreversível do Fluxo:
                </p>
                <p className="mt-1">
                  Ao registrar esta publicação, o processo transitará para o
                  status final <strong>CONCLUÍDO (COMPLETED)</strong>. Não serão
                  permitidas novas alterações ou transições ordinárias.
                </p>
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="mt-md rounded-md bg-error-container p-sm text-xs font-semibold text-on-error-container"
              >
                {formError}
              </div>
            )}

            <div className="mt-lg flex justify-end gap-xs">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                disabled={isSubmitting}
                className="rounded-lg border border-outline-variant px-md py-2 font-label-md text-on-surface hover:bg-surface-container disabled:opacity-50"
              >
                Voltar e Revisar
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-lg py-2 font-label-md font-semibold text-on-primary shadow-xs hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined animate-spin text-base"
                    >
                      progress_activity
                    </span>
                    Concluindo...
                  </>
                ) : (
                  "Confirmar e Concluir Processo"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal to upload supporting document directly */}
      {showUploadModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-supporting-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-md backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-xl">
            <h3
              id="upload-supporting-title"
              className="flex items-center gap-xs font-title-lg font-bold text-on-surface"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-primary"
              >
                upload_file
              </span>
              Anexar Comprovante de Publicação
            </h3>

            <form
              onSubmit={handleUploadSupportingDoc}
              className="mt-md space-y-md"
            >
              <div>
                <label
                  htmlFor="upload-file-input"
                  className="block font-label-md font-semibold text-on-surface mb-1"
                >
                  Arquivo do Comprovante (PDF ou imagem):
                </label>
                <input
                  id="upload-file-input"
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                  className="w-full text-xs text-on-surface-variant file:mr-2 file:rounded file:border-0 file:bg-surface-container-high file:px-3 file:py-2 file:text-xs file:font-semibold file:text-on-surface"
                />
              </div>

              {uploadDocError && (
                <div
                  role="alert"
                  className="rounded-md bg-error-container p-sm text-xs font-semibold text-on-error-container"
                >
                  {uploadDocError}
                </div>
              )}

              <div className="flex justify-end gap-xs">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploadingDoc}
                  className="rounded-lg border border-outline-variant px-md py-1.5 font-label-md text-on-surface hover:bg-surface-container disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploadingDoc || !uploadFile}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-md py-1.5 font-label-md font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  {isUploadingDoc ? "Enviando..." : "Anexar Arquivo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
