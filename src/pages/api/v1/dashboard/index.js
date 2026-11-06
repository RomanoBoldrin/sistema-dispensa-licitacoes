import { createRouter } from "next-connect";

import authentication from "@/infra/authentication";
import controller from "@/infra/controller";
import { prisma } from "@/infra/prisma.js";

const router = createRouter();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

const STATUS_KEYS = [
  "DRAFT",
  "IN_ANALYSIS",
  "PRICE_RESEARCH",
  "SUPPLIER_SELECTED",
  "AWAITING_APPROVAL",
  "RETURNED_FOR_ADJUSTMENT",
  "REJECTED",
  "APPROVED",
  "AWAITING_FINAL_AUTHORIZATION",
  "AWAITING_PUBLICATION",
  "FINAL_AUTHORIZATION_REFUSED",
  "COMPLETED",
];

const STATUS_LABELS = {
  DRAFT: "Rascunho",
  IN_ANALYSIS: "Em Análise",
  PRICE_RESEARCH: "Pesquisa de Preços",
  SUPPLIER_SELECTED: "Fornecedor Selecionado",
  AWAITING_APPROVAL: "Aguardando Aprovação",
  RETURNED_FOR_ADJUSTMENT: "Devolvido p/ Ajustes",
  REJECTED: "Rejeitado",
  APPROVED: "Aprovado",
  AWAITING_FINAL_AUTHORIZATION: "Aguardando Aut. Final",
  AWAITING_PUBLICATION: "Aguardando Publicação",
  FINAL_AUTHORIZATION_REFUSED: "Aut. Recusada",
  COMPLETED: "Concluído",
};

async function getHandler(request, response) {
  response.setHeader(
    "Cache-Control",
    "no-store, no-cache, max-age=0, must-revalidate",
  );
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");

  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);

  // Authorization boundary:
  // - SOLICITANTE sees processes they created (or within their department if set)
  // - AGENTE_CONTRATACAO, APROVADOR and ADMIN have organizational visibility
  const where = {
    deletedAt: null,
  };

  if (user.role === "SOLICITANTE") {
    where.requesterId = user.id;
  }

  // 1. Total counts
  const totalProcesses = await prisma.process.count({ where });

  const inProgress = await prisma.process.count({
    where: {
      ...where,
      status: {
        in: ["IN_ANALYSIS", "PRICE_RESEARCH", "SUPPLIER_SELECTED"],
      },
    },
  });

  const awaitingApproval = await prisma.process.count({
    where: {
      ...where,
      status: "AWAITING_APPROVAL",
    },
  });

  const completed = await prisma.process.count({
    where: {
      ...where,
      status: {
        in: ["APPROVED", "COMPLETED"],
      },
    },
  });

  const drafts = await prisma.process.count({
    where: {
      ...where,
      status: "DRAFT",
    },
  });

  const rejected = await prisma.process.count({
    where: {
      ...where,
      status: "REJECTED",
    },
  });

  const awaitingFinalAuthorization = await prisma.process.count({
    where: {
      ...where,
      status: "AWAITING_FINAL_AUTHORIZATION",
      ...(user.role === "AUTORIDADE_COMPETENTE" && user.departmentId
        ? { departmentId: user.departmentId }
        : {}),
    },
  });

  const awaitingPublication = await prisma.process.count({
    where: {
      ...where,
      status: "AWAITING_PUBLICATION",
      ...(user.role === "AGENTE_CONTRATACAO" && user.departmentId
        ? { departmentId: user.departmentId }
        : {}),
    },
  });

  const finalAuthorizationRefused = await prisma.process.count({
    where: {
      ...where,
      status: "FINAL_AUTHORIZATION_REFUSED",
    },
  });

  const returnedForAdjustment = await prisma.process.count({
    where: {
      ...where,
      status: "RETURNED_FOR_ADJUSTMENT",
    },
  });

  // 2. Financial metrics
  // Process has estimatedValue (Decimal). Total estimated vs approved/homologated estimated value
  const totalValueAgg = await prisma.process.aggregate({
    where,
    _sum: {
      estimatedValue: true,
    },
  });

  const approvedValueAgg = await prisma.process.aggregate({
    where: {
      ...where,
      status: {
        in: ["APPROVED", "COMPLETED"],
      },
    },
    _sum: {
      estimatedValue: true,
    },
  });

  const totalEstimatedValue = totalValueAgg._sum.estimatedValue
    ? Number(totalValueAgg._sum.estimatedValue)
    : 0;

  const approvedEstimatedValue = approvedValueAgg._sum.estimatedValue
    ? Number(approvedValueAgg._sum.estimatedValue)
    : 0;

  // 3. Status distribution
  const statusGrouping = await prisma.process.groupBy({
    by: ["status"],
    where,
    _count: {
      status: true,
    },
  });

  const statusCountMap = Object.fromEntries(
    statusGrouping.map((g) => [g.status, g._count.status]),
  );

  const statusDistribution = STATUS_KEYS.map((key) => ({
    status: key,
    label: STATUS_LABELS[key] || key,
    value: statusCountMap[key] || 0,
  }));

  // 4. Department distribution
  // We query departments and count processes matching the user scope
  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          processes: {
            where,
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const departmentDistribution = departments.map((dept) => ({
    id: dept.id,
    label: dept.name,
    value: dept._count.processes,
  }));

  // 5. Recent processes
  const recentProcessesRaw = await prisma.process.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    take: 6,
    select: {
      id: true,
      number: true,
      year: true,
      title: true,
      object: true,
      estimatedValue: true,
      status: true,
      createdAt: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });

  const recentProcesses = recentProcessesRaw.map((p) => ({
    id: p.id,
    number: p.number,
    year: p.year,
    title: p.title,
    object: p.object,
    department: p.department?.name || "Geral",
    estimatedValue: p.estimatedValue ? Number(p.estimatedValue) : null,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
  }));

  // 6. Actionable attention count based on domain role
  let attentionCount = 0;
  let attentionDescription = "";
  if (user.role === "AUTORIDADE_COMPETENTE") {
    attentionCount = awaitingFinalAuthorization;
    attentionDescription =
      attentionCount === 1
        ? "processo aguardando sua autorização final"
        : "processos aguardando sua autorização final";
  } else if (user.role === "APROVADOR") {
    attentionCount = awaitingApproval;
    attentionDescription = "processos aguardando sua aprovação";
  } else if (user.role === "SOLICITANTE") {
    attentionCount = returnedForAdjustment + drafts;
    attentionDescription =
      "rascunhos ou processos devolvidos necessitando ajuste";
  } else if (user.role === "AGENTE_CONTRATACAO") {
    attentionCount = inProgress + awaitingPublication;
    attentionDescription =
      "processos em instrução ou aguardando registro de publicação";
  } else {
    attentionCount = awaitingApproval + awaitingFinalAuthorization;
    attentionDescription = "processos com deliberações pendentes no sistema";
  }

  return response.status(200).json({
    summary: {
      totalProcesses,
      inProgress,
      awaitingApproval,
      awaitingFinalAuthorization,
      awaitingPublication,
      finalAuthorizationRefused,
      returnedForAdjustment,
      completed,
      drafts,
      rejected,
      totalEstimatedValue,
      approvedEstimatedValue,
      attentionCount,
      attentionDescription,
    },
    statusDistribution,
    departmentDistribution,
    recentProcesses,
    userRole: user.role,
  });
}
