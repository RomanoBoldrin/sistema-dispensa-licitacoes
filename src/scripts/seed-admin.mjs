import { prisma as db } from "../infra/prisma.js";
import password from "../infra/password.js";

async function main() {
  console.log("Starting admin provisioning...");

  const existingAdmin = await db.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (existingAdmin) {
    if (!existingAdmin.departmentId) {
      console.log(
        `Admin user exists but has no department. Ensuring default department...`,
      );
      const defaultDepartment = await db.department.upsert({
        where: { name: "Secretaria de Administração" },
        update: {},
        create: { name: "Secretaria de Administração" },
      });

      await db.user.update({
        where: { id: existingAdmin.id },
        data: { departmentId: defaultDepartment.id },
      });
      console.log(
        `Associated admin with department: ${defaultDepartment.name}.`,
      );
    }

    console.log(
      `You're all set, admin user already exists (username: ${existingAdmin.name}). Exiting successfully.`,
    );
    return;
  }

  let name = process.env.SEED_ADMIN_NAME;
  let email = process.env.SEED_ADMIN_EMAIL;
  let rawPassword = process.env.SEED_ADMIN_PASSWORD;

  if (process.env.NODE_ENV === "production") {
    if (!name || !email || !rawPassword) {
      throw new Error(
        "Missing required SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, or SEED_ADMIN_PASSWORD for production provisioning.",
      );
    }
  } else {
    name = name || "admin";
    email = email || "admin@sisd.com";
    rawPassword = rawPassword || "admin123";
  }

  console.log(`Provisioning default department...`);
  const defaultDepartment = await db.department.upsert({
    where: { name: "Secretaria de Administração" },
    update: {},
    create: { name: "Secretaria de Administração" },
  });

  console.log(`Provisioning admin user: ${name} (${email})...`);

  const passwordHash = await password.hash(rawPassword);

  const newAdmin = await db.user.create({
    data: {
      name: name,
      email: email,
      passwordHash: passwordHash,
      role: "ADMIN",
      isActive: true,
      departmentId: defaultDepartment.id,
    },
  });

  console.log(`Successfully created admin user with ID: ${newAdmin.id}`);
}

main()
  .catch((e) => {
    console.error("Error during admin provisioning:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
