const { prisma } = require("../../../infra/prisma.cjs");

const DEMO_PASSWORD = "password123";

const ROLES = {
  SOLICITANTE: "solicitante@sisd.local",
  AGENTE: "agente@sisd.local",
  APROVADOR: "aprovador@sisd.local",
  AUTORIDADE: "autoridade@sisd.local",
  ADMIN: "admin@sisd.local",
  // Dept 2 (Saúde) for isolation
  SOLICITANTE_DEPT2: "solicitante2@sisd.local",
  AGENTE_DEPT2: "agente2@sisd.local",
  APROVADOR_DEPT2: "aprovador2@sisd.local",
  AUTORIDADE_DEPT2: "autoridade2@sisd.local",
};

/**
 * Asserts that the database URL safely points to a test database.
 */
function assertSafeTestDatabase() {
  const dbUrl = (process.env.DATABASE_URL || "").toLowerCase();
  if (!dbUrl.includes("test")) {
    throw new Error(
      `Safety guard violation: Refusing to run E2E operations against non-test database: ${process.env.DATABASE_URL}`,
    );
  }
}

/**
 * Logs in a user through the UI form.
 */
async function loginAs(page, email, password = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.waitForSelector('input[name="email"]');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await page.waitForSelector("text=Visão Geral", { timeout: 10_000 });
}

/**
 * Cleanly logs out through the UI or cookie clearing.
 */
async function logout(page) {
  try {
    const logoutBtn = page.locator('button:has-text("Sair"), a:has-text("Sair")').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForURL("**/login", { timeout: 10_000 });
      return;
    }
  } catch {
    // Fallback to clearing browser context cookies
  }
  await page.context().clearCookies();
  await page.goto("/login");
  await page.waitForSelector('input[name="email"]', { timeout: 10_000 });
}

/**
 * Cleans up only processes created with a specific title prefix.
 */
async function cleanupTestProcesses(titlePrefix) {
  assertSafeTestDatabase();
  if (!titlePrefix || titlePrefix.length < 4) {
    throw new Error("Must provide a specific title prefix to clean up test processes.");
  }

  const matching = await prisma.process.findMany({
    where: {
      title: { startsWith: titlePrefix },
    },
    select: { id: true },
  });

  const processIds = matching.map((p) => p.id);
  if (processIds.length === 0) return;

  // Delete child records first to respect foreign keys
  await prisma.publicationRecord.deleteMany({ where: { processId: { in: processIds } } });
  await prisma.finalAuthorization.deleteMany({ where: { processId: { in: processIds } } });
  await prisma.approval.deleteMany({ where: { processId: { in: processIds } } });
  await prisma.quotation.deleteMany({ where: { processId: { in: processIds } } });
  await prisma.document.deleteMany({ where: { processId: { in: processIds } } });
  await prisma.demandDocument.deleteMany({ where: { processId: { in: processIds } } });
  await prisma.auditLog.deleteMany({ where: { processId: { in: processIds } } });
  await prisma.process.deleteMany({ where: { id: { in: processIds } } });
}

module.exports = {
  ROLES,
  DEMO_PASSWORD,
  assertSafeTestDatabase,
  loginAs,
  logout,
  cleanupTestProcesses,
};

