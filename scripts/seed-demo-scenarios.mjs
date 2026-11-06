import {
  assertDemoOptIn,
  assertNonProduction,
  sanitizeDatabaseUrl,
} from "./helpers/bootstrap.mjs";
import { seedDemoUsers } from "./seed-demo-users.mjs";

export const DEMO_SUPPLIERS = [
  {
    legalName: "Fornecedor Alfa Materiais e Escritório Ltda",
    tradeName: "Alfa Suprimentos",
    cnpj: "11.222.333/0001-81",
    email: "comercial@alfa.demo",
    phone: "(11) 3333-1111",
  },
  {
    legalName: "Fornecedor Beta Distribuição e Logística SA",
    tradeName: "Beta Distribuidora",
    cnpj: "22.333.444/0001-49",
    email: "vendas@beta.demo",
    phone: "(11) 3333-2222",
  },
  {
    legalName: "Fornecedor Gama Soluções Comerciais Eireli",
    tradeName: "Gama Soluções",
    cnpj: "33.444.555/0001-08",
    email: "contato@gama.demo",
    phone: "(11) 3333-3333",
  },
];

export const DEMO_SCENARIOS = [
  {
    id: "draft",
    name: "Draft Process",
    title:
      "[DEMO-DRAFT] Aquisição de Materiais de Consumo e Expediente Administrativo",
    object:
      "Aquisição de materiais de expediente administrativo para suprimento das demandas dos setores da Secretaria de Administração durante o exercício corrente.",
    category: "COMMON_GOODS",
    detailedJustification:
      "Necessidade de reposição contínua dos estoques do almoxarifado central para assegurar a continuidade dos serviços públicos e rotinas operacionais.",
    estimatedValue: 15000.0,
    expectedStatus: "DRAFT",
    action: "create_draft_only",
  },
  {
    id: "analysis",
    name: "Technical Analysis",
    title:
      "[DEMO-ANALYSIS] Aquisição de Equipamentos de Informática e Estações de Trabalho",
    object:
      "Aquisição de estações de trabalho e periféricos de informática para modernização do parque tecnológico da Secretaria de Administração.",
    category: "IT_GOODS",
    detailedJustification:
      "Substituição de equipamentos obsoletos e suprimento de novas posições de trabalho para atendimento ao público com maior agilidade e confiabilidade.",
    estimatedValue: 42000.0,
    expectedStatus: "IN_ANALYSIS",
    action: "submit_to_analysis",
    values: [42000.0, 44500.0, 46000.0],
  },
  {
    id: "approval",
    name: "Internal Approval",
    title:
      "[DEMO-APPROVAL] Contratação de Serviços de Manutenção Predial Preventiva e Corretiva",
    object:
      "Contratação de serviços comuns de engenharia para manutenção preventiva e corretiva das instalações prediais da sede administrativa.",
    category: "GENERAL_SERVICES",
    detailedJustification:
      "Garantir a integridade física predial, segurança das instalações elétricas e hidráulicas e conforto dos servidores e cidadãos atendidos.",
    estimatedValue: 35000.0,
    expectedStatus: "AWAITING_APPROVAL",
    action: "approve_stage_1",
    values: [35000.0, 37200.0, 38900.0],
  },
  {
    id: "returned",
    name: "Returned for Adjustment",
    title:
      "[DEMO-RETURNED] Aquisição de Materiais de Limpeza e Higienização Hospitalar e Predial",
    object:
      "Aquisição de insumos de limpeza, desinfecção e higienização para manutenção dos prédios públicos municipais.",
    category: "COMMON_GOODS",
    detailedJustification:
      "Atendimento às normas sanitárias e manutenção das condições adequadas de higiene e asseio das repartições públicas.",
    estimatedValue: 18500.0,
    expectedStatus: "RETURNED_FOR_ADJUSTMENT",
    action: "request_adjustment_stage_1",
    values: [18500.0, 19800.0, 21000.0],
  },
  {
    id: "approved",
    name: "Approved Process",
    title:
      "[DEMO-APPROVED] Aquisição de Licenças de Software de Gestão e Suporte Técnico Especializado",
    object:
      "Aquisição de licenças de uso de software para suporte técnico e ferramentas colaborativas para a equipe de gestão documental.",
    category: "IT_GOODS",
    detailedJustification:
      "Modernização da infraestrutura digital e conformidade com as diretrizes de governança de dados da administração municipal.",
    estimatedValue: 28000.0,
    expectedStatus: "APPROVED",
    action: "approve_stage_2",
    values: [28000.0, 29500.0, 31200.0],
  },
  {
    id: "rejected",
    name: "Rejected Process",
    title:
      "[DEMO-REJECTED] Contratação de Serviços de Links Dedicados de Telefonia e Transmissão de Voz",
    object:
      "Contratação de prestação de serviços de telefonia fixa comutada e entroncamento digital para os órgãos da administração.",
    category: "GENERAL_SERVICES",
    detailedJustification:
      "Necessidade de interligação de voz entre os prédios públicos e atendimento aos ramais administrativos.",
    estimatedValue: 49000.0,
    expectedStatus: "REJECTED",
    action: "reject_stage_2",
    values: [49000.0, 52000.0, 55000.0],
  },
];

/**
 * Prepares complete procurement preparation (quotations, supplier selection, legal classification,
 * justifications, and Termo de Referência document) using standard domain services.
 */
async function setupCompleteProcurementPreparation(
  processId,
  {
    solicitanteUser,
    suppliers,
    values = [25000.0, 27000.0, 29000.0],
    selectedIndex = 0,
    quotationService,
    processService,
    legalService,
    documentService,
  },
) {
  const { prisma } = await import("@/infra/prisma.js");

  const existingData = await prisma.process.findUnique({
    where: { id: processId },
    include: { quotations: true, documents: true },
  });

  // 1. Add 3 quotations idempotently
  for (let i = 0; i < 3; i += 1) {
    const s = suppliers[i];
    const val = values[i];
    const hasQuote = existingData.quotations.some((q) => q.supplierId === s.id);
    if (!hasQuote) {
      await quotationService.createQuotation(
        processId,
        {
          supplierId: s.id,
          value: val,
          description: `Proposta comercial apresentada por ${s.tradeName || s.legalName}`,
          quotedAt: "2026-11-01",
        },
        solicitanteUser,
      );
    }
  }

  // 2. Select supplier
  const selectedSupplier = suppliers[selectedIndex];
  if (
    !existingData.selectedSupplierId ||
    existingData.selectedSupplierId !== selectedSupplier.id
  ) {
    await processService.selectProcessSupplier(
      processId,
      {
        supplierId: selectedSupplier.id,
        supplierJustification:
          "Fornecedor selecionado por apresentar a proposta mais vantajosa com menor preço e atendimento integral às especificações técnicas do Termo de Referência.",
      },
      solicitanteUser,
    );
  }

  // 3. Legal classification
  if (!existingData.legalBasis) {
    await legalService.updateProcessLegalClassification(
      processId,
      {
        legalBasis: "ART_75_II",
        legalJustification:
          "Contratação direta por dispensa de licitação em razão do valor, com base no Art. 75, inciso II da Lei Federal nº 14.133/2021, respeitado o limite legal anual e ausência de fracionamento de despesa.",
      },
      solicitanteUser,
    );
  }

  // 4. Price justification
  if (!existingData.priceJustification) {
    await processService.updateProcessJustifications(
      processId,
      {
        priceJustification:
          "O preço praticado encontra-se compatível com os parâmetros de mercado apurados mediante regular pesquisa prévia de preços com três fornecedores do ramo pertinente, nos moldes do Art. 23 da Lei nº 14.133/2021.",
      },
      solicitanteUser,
    );
  }

  // 5. Upload required document (Termo de Referência)
  const hasTr = existingData.documents.some(
    (d) => d.type === "TERMO_REFERENCIA" && !d.deletedAt,
  );
  if (!hasTr) {
    const dummyPdf = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Title (Termo de Referencia Demo) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
    );
    await documentService.uploadProcessDocument(
      processId,
      {
        buffer: dummyPdf,
        filename: "Termo_de_Referencia_Demo.pdf",
        declaredMimeType: "application/pdf",
        type: "TERMO_REFERENCIA",
      },
      solicitanteUser,
    );
  }
}

export async function seedDemoScenarios() {
  assertNonProduction("seed-demo-scenarios.mjs");
  assertDemoOptIn("seed-demo-scenarios.mjs");

  const { prisma } = await import("@/infra/prisma.js");
  const { default: processService } =
    await import("@/services/process.service.js");
  const { default: quotationService } =
    await import("@/services/quotation.service.js");
  const { default: legalService } = await import("@/services/legal.service.js");
  const { default: documentService } =
    await import("@/services/document.service.js");
  const { default: submissionService } =
    await import("@/services/submission.service.js");
  const { default: workflowService } =
    await import("@/services/workflow.service.js");

  console.log("=== Provisioning Phase 4 Demo Procurement Scenarios ===");
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Target Database: ${sanitizeDatabaseUrl()}`);

  // 1. Ensure required demo users and department exist
  let adminDept = await prisma.department.findUnique({
    where: { name: "Secretaria de Administração" },
  });

  let solicitanteUser = await prisma.user.findUnique({
    where: { email: "solicitante@sisd.local" },
  });
  let agenteUser = await prisma.user.findUnique({
    where: { email: "agente@sisd.local" },
  });
  let aprovadorUser = await prisma.user.findUnique({
    where: { email: "aprovador@sisd.local" },
  });
  let autoridadeUser = await prisma.user.findUnique({
    where: { email: "autoridade@sisd.local" },
  });

  if (
    !adminDept ||
    !solicitanteUser ||
    !agenteUser ||
    !aprovadorUser ||
    !autoridadeUser
  ) {
    console.log(
      "Prerequisite demo users or department missing. Automatically provisioning demo users...",
    );
    await seedDemoUsers();

    adminDept = await prisma.department.findUnique({
      where: { name: "Secretaria de Administração" },
    });
    solicitanteUser = await prisma.user.findUnique({
      where: { email: "solicitante@sisd.local" },
    });
    agenteUser = await prisma.user.findUnique({
      where: { email: "agente@sisd.local" },
    });
    aprovadorUser = await prisma.user.findUnique({
      where: { email: "aprovador@sisd.local" },
    });
    autoridadeUser = await prisma.user.findUnique({
      where: { email: "autoridade@sisd.local" },
    });
  }

  // 2. Ensure demo suppliers exist
  console.log("\n1. Ensuring demo suppliers...");
  const suppliers = [];
  for (const sDef of DEMO_SUPPLIERS) {
    const s = await prisma.supplier.upsert({
      where: { cnpj: sDef.cnpj },
      update: {
        legalName: sDef.legalName,
        tradeName: sDef.tradeName,
        email: sDef.email,
        phone: sDef.phone,
      },
      create: sDef,
    });
    suppliers.push(s);
    console.log(
      `  ✓ Supplier "${s.tradeName || s.legalName}" ready (${s.cnpj})`,
    );
  }

  // 3. Provision each scenario idempotently
  console.log("\n2. Provisioning representative workflow scenarios...");
  const results = {
    created: [],
    preserved: [],
    failed: [],
  };

  for (const scenario of DEMO_SCENARIOS) {
    console.log(
      `\n-- Scenario: ${scenario.name} (Expected: ${scenario.expectedStatus}) --`,
    );

    // Check for existing process by title in the department
    const existingProcess = await prisma.process.findFirst({
      where: {
        title: scenario.title,
        departmentId: adminDept.id,
        deletedAt: null,
      },
      include: {
        approvals: { where: { deletedAt: null } },
      },
    });

    if (existingProcess && existingProcess.status === scenario.expectedStatus) {
      const formattedNumber = `DP-${String(existingProcess.number).padStart(3, "0")}/${existingProcess.year}`;
      console.log(
        `  ✓ Process already exists: ${formattedNumber} [Status: ${existingProcess.status}]. Skipping creation to ensure idempotency.`,
      );
      results.preserved.push({
        id: existingProcess.id,
        number: formattedNumber,
        scenario: scenario.name,
        status: existingProcess.status,
      });
      continue;
    }

    try {
      let processId;
      let formattedNumber;

      if (
        existingProcess &&
        existingProcess.status === "DRAFT" &&
        scenario.expectedStatus !== "DRAFT"
      ) {
        // Resume from draft
        processId = existingProcess.id;
        formattedNumber = `DP-${String(existingProcess.number).padStart(3, "0")}/${existingProcess.year}`;
        console.log(
          `  ↻ Resuming setup for existing draft process ${formattedNumber}...`,
        );
        await processService.updateProcess(
          processId,
          { estimatedValue: scenario.estimatedValue },
          solicitanteUser,
        );
      } else {
        // Create new process via processService
        console.log(`  + Creating initial process in DRAFT...`);
        const created = await processService.createProcess(
          {
            title: scenario.title,
            object: scenario.object,
            estimatedValue: scenario.estimatedValue,
            category: scenario.category,
            detailedJustification: scenario.detailedJustification,
            technicalSpecifications:
              "Especificações técnicas de acordo com o Termo de Referência anexo.",
            urgency: "MEDIUM",
            budgetSource: "Recursos Próprios / Tesouro Municipal",
            desiredDeadlineDays: 15,
            responsibleName: solicitanteUser.name,
            responsibleEmail: solicitanteUser.email,
            departmentId: adminDept.id,
          },
          solicitanteUser,
        );

        processId = created.id;
        formattedNumber = `DP-${String(created.number).padStart(3, "0")}/${created.year}`;
      }

      // 2. Execute scenario specific lifecycle transitions
      if (scenario.action === "create_draft_only") {
        console.log(
          `  ✓ Scenario "${scenario.name}" created at ${formattedNumber} [DRAFT].`,
        );
        results.created.push({
          id: processId,
          number: formattedNumber,
          scenario: scenario.name,
          status: "DRAFT",
        });
        continue;
      }

      // Prepare complete procurement data (quotes, selected supplier, justifications, TR doc)
      console.log(
        `  + Preparing complete procurement data (quotations, supplier, TR doc)...`,
      );
      await setupCompleteProcurementPreparation(processId, {
        solicitanteUser,
        suppliers,
        values: scenario.values,
        selectedIndex: 0,
        quotationService,
        processService,
        legalService,
        documentService,
      });

      // Submit process into IN_ANALYSIS
      console.log(`  + Submitting process for internal analysis...`);
      await submissionService.submitProcess(processId, solicitanteUser);

      if (scenario.action === "submit_to_analysis") {
        console.log(
          `  ✓ Scenario "${scenario.name}" created at ${formattedNumber} [IN_ANALYSIS].`,
        );
        results.created.push({
          id: processId,
          number: formattedNumber,
          scenario: scenario.name,
          status: "IN_ANALYSIS",
        });
        continue;
      }

      if (scenario.action === "request_adjustment_stage_1") {
        console.log(`  + Requesting adjustment by procurement agent...`);
        await workflowService.requestAdjustment(
          processId,
          {
            comment:
              "Necessário retificar o detalhamento das especificações técnicas e juntar comprovação complementar da pesquisa de preços.",
          },
          agenteUser,
        );
        console.log(
          `  ✓ Scenario "${scenario.name}" created at ${formattedNumber} [RETURNED_FOR_ADJUSTMENT].`,
        );
        results.created.push({
          id: processId,
          number: formattedNumber,
          scenario: scenario.name,
          status: "RETURNED_FOR_ADJUSTMENT",
        });
        continue;
      }

      // For approval, approved, and rejected: first approve Stage 1
      console.log(
        `  + Approving Stage 1 (Technical Analysis) by procurement agent...`,
      );
      await workflowService.approveStage(
        processId,
        {
          comment:
            "Análise técnica concluída e aprovada. Instrução processual atende aos requisitos do Art. 75, inciso II da Lei nº 14.133/2021.",
        },
        agenteUser,
      );

      if (scenario.action === "approve_stage_1") {
        console.log(
          `  ✓ Scenario "${scenario.name}" created at ${formattedNumber} [AWAITING_APPROVAL].`,
        );
        results.created.push({
          id: processId,
          number: formattedNumber,
          scenario: scenario.name,
          status: "AWAITING_APPROVAL",
        });
        continue;
      }

      if (scenario.action === "approve_stage_2") {
        console.log(
          `  + Approving Stage 2 (Internal Approval) by department approver...`,
        );
        await workflowService.approveStage(
          processId,
          {
            comment:
              "Aprovo a presente contratação direta por dispensa de licitação com fulcro no Art. 75, inciso II da Lei Federal nº 14.133/2021. Encaminhe-se para empenho e publicação.",
          },
          aprovadorUser,
        );
        console.log(
          `  ✓ Scenario "${scenario.name}" created at ${formattedNumber} [APPROVED].`,
        );
        results.created.push({
          id: processId,
          number: formattedNumber,
          scenario: scenario.name,
          status: "APPROVED",
        });
        continue;
      }

      if (scenario.action === "reject_stage_2") {
        console.log(
          `  + Rejecting process at Stage 2 by department approver...`,
        );
        await workflowService.rejectProcess(
          processId,
          {
            comment:
              "Rejeito formalmente a presente contratação direta tendo em vista que a estimativa orçamentária é incompatível com as diretrizes do plano de contratações anual vigente e os prazos de entrega inviabilizam o atendimento da demanda.",
          },
          aprovadorUser,
        );
        console.log(
          `  ✓ Scenario "${scenario.name}" created at ${formattedNumber} [REJECTED].`,
        );
        results.created.push({
          id: processId,
          number: formattedNumber,
          scenario: scenario.name,
          status: "REJECTED",
        });
        continue;
      }
    } catch (err) {
      console.error(
        `  ✕ Error creating scenario "${scenario.name}":`,
        err.message || err,
      );
      results.failed.push({
        scenario: scenario.name,
        error: err.message || err,
      });
    }
  }

  console.log("\n=== Scenarios Summary ===");
  console.log(`Created: ${results.created.length}`);
  console.log(`Preserved: ${results.preserved.length}`);
  console.log(`Failed: ${results.failed.length}`);

  return results;
}

// CLI Execution Entry Point
if (process.argv[1] && process.argv[1].endsWith("seed-demo-scenarios.mjs")) {
  (async () => {
    let exitCode = 0;
    let dbInstance = null;

    try {
      await seedDemoScenarios();
      const { prisma } = await import("@/infra/prisma.js");
      dbInstance = prisma;
    } catch (error) {
      console.error(
        "\n[ERROR] Demo scenario seeding failed:",
        error.message || error,
      );
      exitCode = 1;
    } finally {
      if (dbInstance) {
        await dbInstance.$disconnect();
      } else {
        try {
          const { prisma } = await import("@/infra/prisma.js");
          await prisma.$disconnect();
        } catch {
          // Ignore disconnect error on exit
        }
      }

      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    }
  })();
}
