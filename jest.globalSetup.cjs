const { prisma } = require("./src/infra/prisma.cjs");

module.exports = async function globalSetup() {
  const { default: orchestrator } = await import(
    "./src/tests/orchestrator/orchestrator.mjs"
  );

  await orchestrator.clearDatabase();

  await prisma.$disconnect();
};
