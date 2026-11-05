import {
  assertDemoOptIn,
  assertNonProduction,
  sanitizeDatabaseUrl,
} from "./helpers/bootstrap.mjs";

export const DEMO_DEPARTMENTS = [
  { name: "Secretaria de Administração" },
  { name: "Secretaria de Saúde" },
];

export const DEMO_USERS = [
  {
    name: "Administrador Geral (Demo)",
    email: "admin@sisd.local",
    role: "ADMIN",
    departmentName: null, // Global administrative scope
  },
  {
    name: "Carlos Solicitante (Administração)",
    email: "solicitante@sisd.local",
    role: "SOLICITANTE",
    departmentName: "Secretaria de Administração",
  },
  {
    name: "Ana Agente de Contratação (Administração)",
    email: "agente@sisd.local",
    role: "AGENTE_CONTRATACAO",
    departmentName: "Secretaria de Administração",
  },
  {
    name: "Roberto Aprovador (Administração)",
    email: "aprovador@sisd.local",
    role: "APROVADOR",
    departmentName: "Secretaria de Administração",
  },
  {
    name: "Mariana Solicitante (Saúde)",
    email: "solicitante2@sisd.local",
    role: "SOLICITANTE",
    departmentName: "Secretaria de Saúde",
  },
  {
    name: "Lucas Agente de Contratação (Saúde)",
    email: "agente2@sisd.local",
    role: "AGENTE_CONTRATACAO",
    departmentName: "Secretaria de Saúde",
  },
  {
    name: "Dra. Helena Aprovadora (Saúde)",
    email: "aprovador2@sisd.local",
    role: "APROVADOR",
    departmentName: "Secretaria de Saúde",
  },
];

export async function seedDemoUsers() {
  assertNonProduction("seed-demo-users.mjs");
  assertDemoOptIn("seed-demo-users.mjs");

  const { prisma } = await import("@/infra/prisma.js");
  const { default: password } = await import("@/infra/password.js");

  console.log("=== Provisioning Development Demo Users ===");
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Target Database: ${sanitizeDatabaseUrl()}`);

  const demoPassword = process.env.SEED_DEMO_PASSWORD || "Demo@123456";
  console.log(
    `Using demo password: ${demoPassword.slice(0, 4)}*** (configurable via SEED_DEMO_PASSWORD)`,
  );

  // 1. Provision Departments idempotently
  console.log("\n1. Provisioning demo departments...");
  const departmentMap = new Map();

  for (const deptDef of DEMO_DEPARTMENTS) {
    const dept = await prisma.department.upsert({
      where: { name: deptDef.name },
      update: {},
      create: { name: deptDef.name },
    });
    departmentMap.set(dept.name, dept);
    console.log(`  ✓ Department "${dept.name}" ready (ID: ${dept.id})`);
  }

  // 2. Provision Users idempotently
  console.log("\n2. Provisioning demo users...");
  const passwordHash = await password.hash(demoPassword);
  const results = {
    created: [],
    preserved: [],
    conflicts: [],
  };

  for (const userDef of DEMO_USERS) {
    const targetDept = userDef.departmentName
      ? departmentMap.get(userDef.departmentName)
      : null;
    const targetDepartmentId = targetDept ? targetDept.id : null;

    const existingUser = await prisma.user.findUnique({
      where: { email: userDef.email },
      include: { department: true },
    });

    if (existingUser) {
      if (existingUser.role !== userDef.role) {
        const conflictMsg = `User "${userDef.email}" exists with role "${existingUser.role}", expected "${userDef.role}". Skipped to prevent data corruption.`;
        console.warn(`  ⚠️  ${conflictMsg}`);
        results.conflicts.push({ email: userDef.email, reason: conflictMsg });
        continue;
      }

      // Role matches: ensure active and correct department if needed, but NEVER reset existing password
      let needsUpdate = false;
      const updateData = {};

      if (!existingUser.isActive) {
        updateData.isActive = true;
        needsUpdate = true;
      }

      if (existingUser.departmentId !== targetDepartmentId) {
        updateData.departmentId = targetDepartmentId;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: updateData,
        });
        console.log(
          `  ↻ Updated existing user "${userDef.email}" (department/activation updated, password preserved).`,
        );
      } else {
        console.log(
          `  ✓ User "${userDef.email}" [${userDef.role}] already exists. Password and profile preserved.`,
        );
      }

      results.preserved.push({
        id: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
        department: existingUser.department?.name || "Global",
      });
    } else {
      const createdUser = await prisma.user.create({
        data: {
          name: userDef.name,
          email: userDef.email,
          passwordHash,
          role: userDef.role,
          isActive: true,
          departmentId: targetDepartmentId,
        },
      });

      console.log(
        `  + Created user "${userDef.email}" [${userDef.role}] -> ${userDef.departmentName || "Global"}`,
      );
      results.created.push({
        id: createdUser.id,
        email: createdUser.email,
        role: createdUser.role,
        department: userDef.departmentName || "Global",
      });
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Created: ${results.created.length}`);
  console.log(`Preserved: ${results.preserved.length}`);
  console.log(`Conflicts: ${results.conflicts.length}`);

  return results;
}

// CLI Execution Entry Point
if (process.argv[1] && process.argv[1].endsWith("seed-demo-users.mjs")) {
  (async () => {
    let exitCode = 0;
    let dbInstance = null;

    try {
      await seedDemoUsers();
      const { prisma } = await import("@/infra/prisma.js");
      dbInstance = prisma;
    } catch (error) {
      console.error(
        "\n[ERROR] Demo user seeding failed:",
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
