import { prisma } from "@/infra/prisma.cjs";
import { InternalServerError, MethodNotAllowedError } from "@/infra/errors";
import { createRouter } from "next-connect";

const router = createRouter();

router.get(getHandler);

export default router.handler({
  onNoMatch: onNoMatchHandler,
  onError: onErrorHandler,
});

function onNoMatchHandler(request, response) {
  const publicErrorObject = new MethodNotAllowedError();
  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function onErrorHandler(error, request, response) {
  const publicErrorObject = new InternalServerError({
    cause: error,
  });

  console.error("Error inside next-connect:");
  console.error(publicErrorObject);

  response.status(500).json(publicErrorObject);
}

async function getHandler(request, response) {
  const updatedAt = new Date().toISOString();

  // Postgres Version
  const databaseVersionResult = await prisma.$queryRaw`
      SHOW server_version;
    `;

  const databaseVersionRaw = databaseVersionResult?.[0]?.server_version ?? null;

  const databaseVersionValue =
    typeof databaseVersionRaw === "string"
      ? (databaseVersionRaw.match(/^\d+(\.\d+)+/)?.[0] ?? null)
      : null;

  // Max Connections
  const databaseMaxConnectionsResult = await prisma.$queryRaw`
      SHOW max_connections;
    `;

  const databaseMaxConnectionsRaw =
    databaseMaxConnectionsResult?.[0]?.max_connections ?? "0";

  const databaseName = new URL(process.env.DATABASE_URL).pathname.slice(1);

  // Opened Connections
  const openedConnectionsResult = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM pg_stat_activity
      WHERE datname = ${databaseName};
    `;

  // Safely reads the "count" field from the first SQL result row; if the result/row is missing, defaults to 0
  const openedConnectionsRaw = openedConnectionsResult?.[0]?.count ?? 0;

  // Response Body
  return response.status(200).json({
    updated_at: updatedAt,
    dependencies: {
      database: {
        version: databaseVersionValue,
        max_connections: parseInt(databaseMaxConnectionsRaw, 10),
        opened_connections: parseInt(openedConnectionsRaw, 10),
      },
    },
  });
}
