import fs from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const projectRoot = path.resolve(currentDir, "../..");

// 1. Register ES module alias loader for `@/*` -> `<projectRoot>/src/*`
// (Skip in Jest environment since Jest uses moduleNameMapper)
if (typeof register === "function" && !process.env.JEST_WORKER_ID) {
  const loaderCode = `
import { pathToFileURL } from "node:url";
import path from "node:path";

const srcUrl = pathToFileURL(${JSON.stringify(path.resolve(projectRoot, "src"))}).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const subpath = specifier.slice(2);
    return nextResolve(\`\${srcUrl}/\${subpath}\`, context);
  }
  return nextResolve(specifier, context);
}
`;

  try {
    register("data:text/javascript," + encodeURIComponent(loaderCode));
  } catch {
    // If already registered or not supported, continue
  }
}

// 2. Load environment files in appropriate order if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  const envFiles = [".env.development", ".env.local", ".env"];
  for (const envFile of envFiles) {
    const fullPath = path.join(projectRoot, envFile);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath });
      if (process.env.DATABASE_URL) break;
    }
  }
}

/**
 * Masks credentials from database connection string for safe console logging.
 */
export function sanitizeDatabaseUrl(rawUrl = process.env.DATABASE_URL) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return "[DATABASE_URL not set]";
  }
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = "***";
    }
    return parsed.toString();
  } catch {
    return rawUrl.replace(/:([^@/]+)@/, ":***@");
  }
}

/**
 * Validates whether the script is safe to execute in the current environment.
 */
export function assertNonProduction(scriptName) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `[SECURITY] Script "${scriptName}" is strictly prohibited from running in production environment (NODE_ENV=production).`,
    );
  }
}

/**
 * Verifies explicit opt-in for demo seeding scripts.
 */
export function assertDemoOptIn(scriptName) {
  const isOptedIn =
    process.env.ENABLE_DEMO_SEED === "true" ||
    process.argv.includes("--force") ||
    process.argv.includes("--yes");

  if (!isOptedIn) {
    throw new Error(
      `[SAFETY] "${scriptName}" requires explicit opt-in. Pass ENABLE_DEMO_SEED=true in environment or append --force.`,
    );
  }
}

export { projectRoot };
