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
  RETURNED_FOR_ADJUSTMENT: "Devolvido para Ajustes",
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
  RETURNED_FOR_ADJUSTMENT:
    "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/40",
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

export const CATEGORY_LABELS = {
  IT_GOODS: "Bens de TI",
  COMMON_GOODS: "Materiais Comuns",
  GENERAL_SERVICES: "Serviços Gerais",
  ENGINEERING_WORKS: "Obras de Engenharia",
  HEALTH_SUPPLIES: "Insumos de Saúde",
  OTHER: "Outros",
};

export const URGENCY_LABELS = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export const URGENCY_BADGE_STYLES = {
  LOW: "bg-secondary-container text-on-secondary-container border-secondary/20",
  MEDIUM:
    "bg-surface-container-high text-on-surface-variant border-outline-variant/60",
  HIGH: "bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary/30",
  CRITICAL: "bg-error-container text-on-error-container border-error/30",
};

export const AUDIT_ACTION_LABELS = {
  PROCESS_CREATED: "Processo criado",
  PROCESS_UPDATED: "Processo atualizado",
  PROCESS_SUBMITTED: "Processo submetido para análise",
  DEMAND_DOCUMENT_CREATED: "DFD registrado",
  DEMAND_DOCUMENT_UPDATED: "DFD atualizado",
  QUOTATION_ADDED: "Cotação adicionada",
  QUOTATION_UPDATED: "Cotação atualizada",
  SUPPLIER_SELECTED: "Fornecedor selecionado",
  DOCUMENT_UPLOADED: "Documento anexado",
  PROCESS_SENT_FOR_APPROVAL: "Enviado para aprovação",
  PROCESS_APPROVED: "Processo aprovado",
  PROCESS_REJECTED: "Processo rejeitado",
  PROCESS_COMPLETED: "Processo concluído",
  LEGAL_CLASSIFICATION_UPDATED: "Enquadramento legal atualizado",
  PRICE_JUSTIFICATION_UPDATED: "Justificativa de preço atualizada",
  SUPPLIER_JUSTIFICATION_UPDATED: "Justificativa do fornecedor atualizada",
  APPROVAL_TASK_ASSIGNED: "Tarefa de aprovação atribuída",
  APPROVAL_STAGE_APPROVED: "Etapa de análise técnica aprovada",
  PROCESS_ADJUSTMENT_REQUESTED: "Ajustes solicitados no processo",
  PROCESS_RESUBMITTED: "Processo ressubmetido após ajustes",
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

export function formatDateTime(dateString) {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "—";
  }
}

export function formatProcessNumber(number, year) {
  if (!number || !year) return "DP-—/—";
  return `DP-${String(number).padStart(3, "0")}/${year}`;
}

export const ALLOWED_DOCUMENT_TYPES = [
  "PESQUISA_PRECOS",
  "JUSTIFICATIVA_PRECO",
  "RAZAO_ESCOLHA_FORNECEDOR",
  "DOCUMENTACAO_FORNECEDOR",
  "PARECER_JURIDICO",
  "TERMO_REFERENCIA",
  "OUTRO",
];

export const DOCUMENT_TYPE_LABELS = {
  TERMO_REFERENCIA: "Termo de Referência (TR)",
  PESQUISA_PRECOS: "Pesquisa de Preços",
  DOCUMENTACAO_FORNECEDOR: "Documentação do Fornecedor",
  JUSTIFICATIVA_PRECO: "Justificativa de Preço",
  RAZAO_ESCOLHA_FORNECEDOR: "Razão da Escolha do Fornecedor",
  PARECER_JURIDICO: "Parecer Jurídico",
  OUTRO: "Outro Documento",
};

export function normalizeCnpj(cnpj) {
  if (typeof cnpj !== "string") return "";
  return cnpj.replace(/\D/g, "");
}

export function formatCnpj(cnpj) {
  const digits = normalizeCnpj(cnpj);
  if (digits.length !== 14) return cnpj || "";
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

export function normalizePhone(phone) {
  if (typeof phone !== "string") return "";
  const digits = phone.replace(/\D/g, "");
  if (
    (digits.length === 12 || digits.length === 13) &&
    digits.startsWith("55")
  ) {
    return digits.slice(2);
  }
  return digits;
}

export function formatPhone(phone) {
  const digits = normalizePhone(phone).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function isValidCnpj(cnpj) {
  if (typeof cnpj !== "string") return false;
  const clean = normalizeCnpj(cnpj);
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let sum = 0;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 12; i++) {
    sum += Number(clean[i]) * weights1[i];
  }
  let rem = sum % 11;
  const d1 = rem < 2 ? 0 : 11 - rem;
  if (Number(clean[12]) !== d1) return false;

  sum = 0;
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 13; i++) {
    sum += Number(clean[i]) * weights2[i];
  }
  rem = sum % 11;
  const d2 = rem < 2 ? 0 : 11 - rem;
  return Number(clean[13]) === d2;
}
