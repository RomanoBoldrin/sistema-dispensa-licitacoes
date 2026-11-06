import { sanitizeDatabaseUrl } from "./helpers/bootstrap.mjs";

async function main() {
  const { prisma } = await import("@/infra/prisma.js");
  const { default: password } = await import("@/infra/password.js");

  const isProduction = process.env.NODE_ENV === "production";
  console.log("=== Provisioning System Administrator ===");
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Target Database: ${sanitizeDatabaseUrl()}`);

  const name =
    process.env.SEED_ADMIN_NAME ||
    (isProduction ? null : "Administrador do Sistema");
  const email = (
    process.env.SEED_ADMIN_EMAIL || (isProduction ? null : "admin@sisd.gov.br")
  )
    ?.toLowerCase()
    ?.trim();
  const rawPassword =
    process.env.SEED_ADMIN_PASSWORD || (isProduction ? null : "password123");

  // Production security guards
  if (isProduction) {
    const missingVars = [];
    if (!name) missingVars.push("SEED_ADMIN_NAME");
    if (!email) missingVars.push("SEED_ADMIN_EMAIL");
    if (!rawPassword) missingVars.push("SEED_ADMIN_PASSWORD");

    if (missingVars.length > 0) {
      throw new Error(
        `[SECURITY] Missing required environment variables for production administrator provisioning: ${missingVars.join(
          ", ",
        )}.`,
      );
    }

    if (rawPassword.length < 12) {
      throw new Error(
        "[SECURITY] SEED_ADMIN_PASSWORD must contain at least 12 characters in production environment.",
      );
    }

    const forbiddenDefaults = [
      "admin123",
      "Admin@123456",
      "admin@sisd",
      "password123",
    ];
    if (forbiddenDefaults.includes(rawPassword)) {
      throw new Error(
        "[SECURITY] Predictable default passwords are strictly prohibited in production.",
      );
    }
  }

  // Idempotent search by explicit administrator email
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { department: true },
  });

  if (existingUser) {
    if (existingUser.role !== "ADMIN") {
      throw new Error(
        `Account conflict: User with email "${email}" already exists with role "${existingUser.role}". It cannot be converted to an administrator automatically.`,
      );
    }

    console.log(
      `Administrator account "${email}" already exists (ID: ${existingUser.id}, Name: "${existingUser.name}").`,
    );
    console.log(
      `Department scope: ${existingUser.department?.name || "Global / Sem lotação departamental (acesso amplo)"}.`,
    );
    console.log(
      "Existing administrator password and identity preserved. No changes made.",
    );
    return { created: false, user: existingUser };
  }

  console.log(`Creating administrator account: ${name} <${email}>...`);
  const passwordHash = await password.hash(rawPassword);

  const newAdmin = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "ADMIN",
      isActive: true,
      departmentId: null, // Global administrative scope: null departmentId represents systemic oversight
    },
  });

  console.log(
    `Successfully created administrator account with ID: ${newAdmin.id}`,
  );
  return { created: true, user: newAdmin };
}

export async function seedAdmin() {
  return main();
}

export default seedAdmin;

// CLI Execution Entry Point
if (process.argv[1] && process.argv[1].endsWith("seed-admin.mjs")) {
  (async () => {
    let exitCode = 0;
    let dbInstance = null;

    try {
      await main();
      const { prisma } = await import("@/infra/prisma.js");
      dbInstance = prisma;
    } catch (error) {
      console.error(
        "\n[ERROR] Admin provisioning failed:",
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
