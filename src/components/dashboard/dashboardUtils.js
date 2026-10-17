/**
 * Dashboard constants and formatting utilities.
 * Follows SISD domain model, status enums, and design system tokens.
 */

export const STATUS_LABELS = {
  DRAFT: "Rascunho",
  IN_ANALYSIS: "Em Análise",
  PRICE_RESEARCH: "Pesquisa de Preços",
  SUPPLIER_SELECTED: "Fornecedor Selecionado",
  AWAITING_APPROVAL: "Aguardando Aprovação",
  REJECTED: "Rejeitado",
  APPROVED: "Aprovado",
  COMPLETED: "Concluído",
};

export const STATUS_BADGE_STYLES = {
  DRAFT:
    "bg-surface-container-high text-on-surface-variant border-outline-variant/60",
  IN_ANALYSIS:
    "bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary/20",
  PRICE_RESEARCH:
    "bg-secondary-container text-on-secondary-container border-secondary/20",
  SUPPLIER_SELECTED:
    "bg-secondary-container text-on-secondary-container border-secondary/20",
  AWAITING_APPROVAL:
    "bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary/30",
  REJECTED: "bg-error-container text-on-error-container border-error/20",
  APPROVED: "bg-primary-fixed text-on-primary-fixed-variant border-primary/20",
  COMPLETED: "bg-primary-fixed text-on-primary-fixed-variant border-primary/20",
};

export const ROLE_LABELS = {
  ADMIN: "Administrador",
  SOLICITANTE: "Solicitante",
  AGENTE_CONTRATACAO: "Agente de Contratação",
  APROVADOR: "Aprovador",
};

export const LIFECYCLE_STAGES = [
  {
    step: 1,
    title: "Rascunho e DFD",
    description:
      "Formalização inicial da necessidade e cadastro do documento de demanda.",
    statusKey: "DRAFT",
    icon: "edit_document",
  },
  {
    step: 2,
    title: "Enquadramento Legal",
    description:
      "Indicação da fundamentação legal específica para dispensa de licitação.",
    statusKey: "DRAFT",
    icon: "gavel",
  },
  {
    step: 3,
    title: "Documentação Exigida",
    description:
      "Anexação de certidões, justificativas técnicas e documentos do processo.",
    statusKey: "IN_ANALYSIS",
    icon: "folder_zip",
  },
  {
    step: 4,
    title: "Pesquisa de Preços",
    description:
      "Coleta e registro de cotações para cálculo do valor de referência.",
    statusKey: "PRICE_RESEARCH",
    icon: "request_quote",
  },
  {
    step: 5,
    title: "Seleção e Justificativa",
    description:
      "Escolha do fornecedor qualificado com justificativa fundamentada.",
    statusKey: "SUPPLIER_SELECTED",
    icon: "verified_user",
  },
  {
    step: 6,
    title: "Envio para Análise",
    description:
      "Conferência completa e submissão formal para aprovação da autoridade.",
    statusKey: "AWAITING_APPROVAL",
    icon: "send",
  },
  {
    step: 7,
    title: "Aprovação ou Devolução",
    description: "Revisão e parecer decisório pelo aprovador responsável.",
    statusKey: "APPROVED",
    icon: "fact_check",
  },
  {
    step: 8,
    title: "Homologação e Conclusão",
    description: "Finalização do procedimento administrativo de dispensa.",
    statusKey: "COMPLETED",
    icon: "task_alt",
  },
];

export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return "—";
  }
}

export function formatProcessNumber(number, year) {
  if (!number || !year) return "DP-—/—";
  return `DP-${String(number).padStart(3, "0")}/${year}`;
}
