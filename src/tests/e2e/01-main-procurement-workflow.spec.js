const path = require("path");
const { test, expect } = require("@playwright/test");
const { loginAs, logout, ROLES, cleanupTestProcesses } = require("./helpers/e2e-helper");

const TITLE_PREFIX = "[E2E-MAIN]";
const PROCESS_TITLE = `${TITLE_PREFIX} Aquisição de Licenças Antivírus Corporativo`;
const FIXTURE_PDF = path.resolve(__dirname, "../fixtures/sample.pdf");

test.describe.serial("Main Successful Procurement Workflow (Phases 1-5)", () => {
  let processId = null;

  test.beforeAll(async () => {
    await cleanupTestProcesses(TITLE_PREFIX);
  });

  test.afterAll(async () => {
    await cleanupTestProcesses(TITLE_PREFIX);
  });

  test("Step 1: Solicitante creates demand formalization (DFD) and saves as DRAFT", async ({ page }) => {
    // 1. Log in as SOLICITANTE
    await loginAs(page, ROLES.SOLICITANTE);

    // 2. Navigate to new process page
    await page.goto("/processes/new");
    await expect(page.locator("main h1")).toContainText("Novo Processo de Dispensa (DFD)");

    // Step 0: Object & Category
    await page.fill('input[name="title"]', PROCESS_TITLE);
    await page.fill(
      'textarea[name="object"]',
      "Contratação direta de fornecimento de 50 licenças anuais de antivírus e endpoint protection para estações de trabalho.",
    );
    await page.fill(
      'textarea[name="description"]',
      "Processo prioritário para prevenção de incidentes de segurança cibernética.",
    );
    // Select IT_GOODS
    await page.locator('button[type="button"]:has-text("Bens de TI")').click();
    await page.locator('button:has-text("Próximo")').click();

    // Step 1: Details & Justification
    await expect(page.locator("h2")).toContainText("Detalhes da demanda");
    await page.fill(
      'textarea[name="detailedJustification"]',
      "As licenças atuais expiram no próximo mês. A continuidade do serviço é essencial para resguardar dados sensíveis da administração.",
    );
    await page.fill(
      'textarea[name="technicalSpecifications"]',
      "Licenças anuais com suporte técnico e gerenciamento centralizado em nuvem.",
    );
    await page.fill('input[name="estimatedValue"]', "35000.00");
    await page.fill('input[name="legalBasis"]', "Art. 75, II da Lei 14.133/2021");
    await page.locator('button:has-text("Próximo")').click();

    // Step 2: Responsible & Administrative
    await expect(page.locator("h2")).toContainText("Informações administrativas");
    await page.fill('input[name="responsibleName"]', "Carlos Solicitante");
    await page.fill('input[name="responsibleEmail"]', "solicitante@sisd.local");
    await page.fill('input[name="budgetSource"]', "Dotação Orçamentária 04.122.0001.2001");
    await page.fill('input[name="desiredDeadlineDays"]', "30");
    await page.locator('button:has-text("Próximo")').click();

    // Step 3: Review & Submit
    const submitBtn = page.locator('button:has-text("Salvar Rascunho e DFD")');
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
    }

    // Verify Success Screen
    await expect(page.locator("text=Processo e DFD salvos em rascunho!")).toBeVisible({ timeout: 15_000 });

    // Open process
    const openBtn = page.locator('a:has-text("Abrir Processo")');
    await expect(openBtn).toBeVisible();
    const href = await openBtn.getAttribute("href");
    expect(href).toMatch(/\/processes\/[a-f0-9-]+/);
    processId = href.split("/").pop();

    await openBtn.click();
    await page.waitForURL(`**/processes/${processId}`);

    // Verify initial DRAFT status badge
    await expect(page.locator('span:has-text("Rascunho")').first()).toBeVisible();

    // Verify presence in processes list
    await page.goto("/processes");
    await expect(page.locator(`text=${PROCESS_TITLE}`)).toBeVisible();

    await logout(page);
  });

  test("Step 2: Agente de Contratação registers price research, legal basis, justifications, and document", async ({
    page,
  }) => {
    expect(processId).toBeTruthy();
    await loginAs(page, ROLES.AGENTE);
    await page.goto(`/processes/${processId}`);

    // 1. Price Research Tab
    await page.click("#tab-quotations");
    await page.waitForSelector("#tabpanel-quotations");

    // Add 1st Quotation (R$ 32.000)
    await page.click('button:has-text("Nova Cotação")');
    await page.waitForSelector("#quote-supplier");
    await page.selectOption("#quote-supplier", { index: 1 });
    await page.fill("#quote-value", "32000.00");
    await page.fill("#quote-desc", "Proposta Alfa Comercial com suporte 24/7.");
    await page.click('button[type="submit"]:has-text("Salvar Cotação")');
    await expect(page.locator("#tabpanel-quotations")).toContainText("32.000,00");

    // Add 2nd Quotation (R$ 34.000)
    await page.click('button:has-text("Nova Cotação")');
    await page.waitForSelector("#quote-supplier");
    await page.selectOption("#quote-supplier", { index: 2 });
    await page.fill("#quote-value", "34000.00");
    await page.fill("#quote-desc", "Proposta Beta Distribuição com garantia padrão.");
    await page.click('button[type="submit"]:has-text("Salvar Cotação")');
    await expect(page.locator("#tabpanel-quotations")).toContainText("34.000,00");

    // Add 3rd Quotation (R$ 36.000)
    await page.click('button:has-text("Nova Cotação")');
    await page.waitForSelector("#quote-supplier");
    await page.selectOption("#quote-supplier", { index: 3 });
    await page.fill("#quote-value", "36000.00");
    await page.fill("#quote-desc", "Proposta Gama Soluções.");
    await page.click('button[type="submit"]:has-text("Salvar Cotação")');
    await expect(page.locator("#tabpanel-quotations")).toContainText("36.000,00");

    // 2. Legal Classification Tab
    await page.click("#tab-legal");
    await page.waitForSelector("#tabpanel-legal");
    await page.fill(
      "#legal-justification",
      "Enquadramento no Art. 75, inciso II da Lei Federal nº 14.133/2021, tendo em vista que o valor total é inferior ao limite legal.",
    );
    await page.click('button:has-text("Salvar Enquadramento")');
    await expect(page.locator("text=Enquadramento jurídico atualizado com sucesso!")).toBeVisible({ timeout: 10_000 });

    // 3. Justifications Tab (Supplier Choice & Price Justification)
    await page.click("#tab-justifications");
    await page.waitForSelector("#tabpanel-justifications");

    // Select Winning Supplier (Alfa Suprimentos)
    await page.selectOption("#select-supplier", { index: 1 });
    await page.fill(
      "#supplier-justification",
      "Fornecedor selecionado por apresentar a proposta mais vantajosa (menor preço global) e atender a todos os requisitos técnicos.",
    );
    await page.click('button:has-text("Confirmar Seleção do Fornecedor")');
    await expect(page.locator("text=Fornecedor e justificativa da escolha salvos com sucesso!")).toBeVisible({
      timeout: 10_000,
    });

    // Price Justification
    await page.fill(
      "#price-justification",
      "O preço contratado é compatível com os valores praticados no mercado conforme ampla pesquisa de preços realizada com 3 fornecedores.",
    );
    await page.click('button:has-text("Salvar Justificativa de Preço")');
    await expect(page.locator("text=Justificativa de preço salva com sucesso!")).toBeVisible({ timeout: 10_000 });

    // 4. Documents Tab (Upload Termo de Referência)
    await page.click("#tab-documents");
    await page.waitForSelector("#tabpanel-documents");

    await page.selectOption("#doc-type-select", "TERMO_REFERENCIA");
    await page.locator("#doc-file-input").setInputFiles(FIXTURE_PDF);
    await page.click('button:has-text("Anexar Documento")');
    await expect(page.locator("text=anexado com sucesso!")).toBeVisible({ timeout: 10_000 });

    // 5. Review Tab: Verify completeness
    await page.click("#tab-review");
    await page.waitForSelector("#tabpanel-review");

    const submitBtn = page.locator('button:has-text("Submeter Processo")');
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });

    await logout(page);
  });

  test("Step 3: Agente de Contratação submits process and approves Stage 1 (Technical Analysis)", async ({ page }) => {
    expect(processId).toBeTruthy();
    await loginAs(page, ROLES.AGENTE);
    await page.goto(`/processes/${processId}`);

    // Submit process
    await page.click("#tab-review");
    await page.click('button:has-text("Submeter Processo")');

    // Confirm in modal
    const confirmBtn = page.locator('button:has-text("Confirmar Submissão")');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify transition to IN_ANALYSIS
    await expect(page.locator('span:has-text("Em Análise")').first()).toBeVisible({ timeout: 15_000 });

    // Go to Approvals Tab to perform Stage 1 Technical Approval
    await page.click("#tab-approvals");
    await page.waitForSelector("#tabpanel-approvals");

    const approveStage1Btn = page.locator('button:has-text("Aprovar Análise & Encaminhar")');
    await expect(approveStage1Btn).toBeVisible({ timeout: 10_000 });
    await approveStage1Btn.click();

    // Confirm in modal
    const modalApproveBtn = page.locator('button:has-text("Confirmar Aprovação")');
    await expect(modalApproveBtn).toBeVisible();
    await modalApproveBtn.click();

    // Verify transition to AWAITING_APPROVAL
    await expect(page.locator('span:has-text("Aguardando Aprovação")').first()).toBeVisible({ timeout: 15_000 });

    await logout(page);
  });

  test("Step 4: Aprovador performs Stage 2 approval (Internal Approval -> APPROVED)", async ({ page }) => {
    expect(processId).toBeTruthy();
    await loginAs(page, ROLES.APROVADOR);

    // Verify pending task in Approvals Inbox
    await page.goto("/approvals");
    await expect(page.locator(`text=${PROCESS_TITLE}`)).toBeVisible({ timeout: 10_000 });

    // Open process
    await page.goto(`/processes/${processId}`);
    await page.click("#tab-approvals");
    await page.waitForSelector("#tabpanel-approvals");

    const approveStage2Btn = page.locator('button:has-text("Aprovar Processo")');
    await expect(approveStage2Btn).toBeVisible({ timeout: 10_000 });
    await approveStage2Btn.click();

    // Fill comment and confirm
    await page.fill(
      "#decision-comment",
      "Instrução técnica em conformidade com as diretrizes normativas. Aprovo a continuidade da contratação direta.",
    );
    const confirmApproveBtn = page.locator('button:has-text("Confirmar Aprovação")');
    await expect(confirmApproveBtn).toBeVisible();
    await confirmApproveBtn.click();

    // Verify transition to APPROVED
    await expect(page.locator('span:has-text("Aprovado")').first()).toBeVisible({ timeout: 15_000 });

    await logout(page);
  });

  test("Step 5: Agente de Contratação explicitly initiates final authorization", async ({ page }) => {
    expect(processId).toBeTruthy();
    await loginAs(page, ROLES.AGENTE);
    await page.goto(`/processes/${processId}`);

    await page.click("#tab-final-authorization");
    await page.waitForSelector("#tabpanel-final-authorization");

    const initiateBtn = page.locator('button:has-text("Encaminhar para Autoridade Competente")');
    await expect(initiateBtn).toBeVisible({ timeout: 10_000 });
    await initiateBtn.click();

    // Confirm in modal
    const confirmInitiateBtn = page.locator('button:has-text("Confirmar Encaminhamento")');
    await expect(confirmInitiateBtn).toBeVisible();
    await confirmInitiateBtn.click();

    // Verify transition to AWAITING_FINAL_AUTHORIZATION
    await expect(page.locator('span:has-text("Aguardando Autorização Final")').first()).toBeVisible({ timeout: 15_000 });

    await logout(page);
  });

  test("Step 6: Autoridade Competente grants final authorization (-> AWAITING_PUBLICATION)", async ({ page }) => {
    expect(processId).toBeTruthy();
    await loginAs(page, ROLES.AUTORIDADE);

    // Verify pending process in Final Authorization Inbox
    await page.goto("/final-authorizations");
    await expect(page.locator(`text=${PROCESS_TITLE}`)).toBeVisible({ timeout: 10_000 });

    // Open process
    await page.goto(`/processes/${processId}`);
    await page.click("#tab-final-authorization");
    await page.waitForSelector("#tabpanel-final-authorization");

    // Click Authorize
    const authorizeBtn = page.locator('button:has-text("Autorizar")');
    await expect(authorizeBtn).toBeVisible({ timeout: 10_000 });
    await authorizeBtn.click();

    // Add justification/remarks and confirm
    await page.fill(
      "#final-auth-justification",
      "Autorizo formalmente a presente dispensa de licitação com fulcro na documentação instrutória apresentada.",
    );
    const confirmAuthBtn = page.locator('button:has-text("Confirmar Autorização")');
    await expect(confirmAuthBtn).toBeVisible();
    await confirmAuthBtn.click();

    // Verify transition to AWAITING_PUBLICATION
    await expect(page.locator('span:has-text("Aguardando Publicação")').first()).toBeVisible({ timeout: 15_000 });

    await logout(page);
  });

  test("Step 7: Agente de Contratação registers publication and completes process", async ({ page }) => {
    expect(processId).toBeTruthy();
    await loginAs(page, ROLES.AGENTE);

    // Verify process in Publications inbox
    await page.goto("/publications");
    await expect(page.locator(`text=${PROCESS_TITLE}`)).toBeVisible({ timeout: 10_000 });

    // Open process
    await page.goto(`/processes/${processId}`);
    await page.click("#tab-publications");
    await page.waitForSelector("#tabpanel-publications");

    // Fill publication form
    await page.fill("#pub-destination", "Diário Oficial do Município - Edição Ordinária nº 2048");
    await page.fill("#pub-ref", "DOM-2026-11-05");
    await page.fill("#pub-url", "https://diario.municipio.gov.br/edicoes/2026/11/05/dispensa-2048.pdf");

    // Submit publication form
    await page.click('button:has-text("Registrar Publicação & Concluir Processo")');

    // Confirm in modal
    const confirmCompleteBtn = page.locator('button:has-text("Confirmar e Concluir Processo")');
    await expect(confirmCompleteBtn).toBeVisible({ timeout: 10_000 });
    await confirmCompleteBtn.click();

    // Verify transition to COMPLETED
    await expect(page.locator('span:has-text("Concluído")').first()).toBeVisible({ timeout: 15_000 });

    await logout(page);
  });

  test("Step 8: Final verification of timeline, approval history, authorization, publication, and audit trail", async ({
    page,
  }) => {
    expect(processId).toBeTruthy();
    await loginAs(page, ROLES.SOLICITANTE);
    await page.goto(`/processes/${processId}`);

    // 1. Verify timeline shows COMPLETED
    await expect(page.locator('span:has-text("Concluído")').first()).toBeVisible();
    await expect(page.locator("text=Processo Concluído com Publicação Registrada")).toBeVisible();

    // 2. Verify Final Authorization Tab
    await page.click("#tab-final-authorization");
    await page.waitForSelector("#tabpanel-final-authorization");
    await expect(page.locator("text=Autorizado")).toBeVisible();
    await expect(page.locator("text=Dra. Patrícia Autoridade")).toBeVisible();

    // 3. Verify Publications Tab
    await page.click("#tab-publications");
    await page.waitForSelector("#tabpanel-publications");
    await expect(page.locator("text=Diário Oficial do Município - Edição Ordinária nº 2048")).toBeVisible();
    await expect(page.locator("text=DOM-2026-11-05")).toBeVisible();

    // 4. Verify History / Audit Tab
    await page.click("#tab-history");
    await page.waitForSelector("#tabpanel-history");
    await expect(page.locator("text=Criação do Processo")).toBeVisible();
    await expect(page.locator("text=Publicação Registrada")).toBeVisible();
    await expect(page.locator("text=Processo Concluído")).toBeVisible();

    await logout(page);
  });
});
