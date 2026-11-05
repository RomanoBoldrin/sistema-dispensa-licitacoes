import {
  assertDemoOptIn,
  assertNonProduction,
  sanitizeDatabaseUrl,
} from "../../../scripts/helpers/bootstrap.mjs";

describe("Seeding Helpers & Safety Guards (Unit Tests)", () => {
  const originalEnv = { ...process.env };
  const originalArgv = [...process.argv];

  afterEach(() => {
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];
  });

  describe("sanitizeDatabaseUrl", () => {
    it("masks password from PostgreSQL connection string", () => {
      const raw =
        "postgresql://myuser:SuperSecretPassword123@db.example.com:5432/proddb?schema=public";
      const sanitized = sanitizeDatabaseUrl(raw);
      expect(sanitized).toBe(
        "postgresql://myuser:***@db.example.com:5432/proddb?schema=public",
      );
      expect(sanitized).not.toContain("SuperSecretPassword123");
    });

    it("returns placeholder if rawUrl is missing or invalid", () => {
      expect(sanitizeDatabaseUrl(null)).toBe("[DATABASE_URL not set]");
      expect(sanitizeDatabaseUrl("")).toBe("[DATABASE_URL not set]");
    });
  });

  describe("assertNonProduction", () => {
    it("throws error when NODE_ENV is production", () => {
      process.env.NODE_ENV = "production";
      expect(() => assertNonProduction("test-script.mjs")).toThrow(
        /strictly prohibited from running in production environment/,
      );
    });

    it("does not throw when NODE_ENV is development or test", () => {
      process.env.NODE_ENV = "development";
      expect(() => assertNonProduction("test-script.mjs")).not.toThrow();

      process.env.NODE_ENV = "test";
      expect(() => assertNonProduction("test-script.mjs")).not.toThrow();
    });
  });

  describe("assertDemoOptIn", () => {
    it("throws error when neither ENABLE_DEMO_SEED nor CLI flags are provided", () => {
      delete process.env.ENABLE_DEMO_SEED;
      process.argv = ["node", "test-script.mjs"];

      expect(() => assertDemoOptIn("test-script.mjs")).toThrow(
        /requires explicit opt-in\. Pass ENABLE_DEMO_SEED=true/,
      );
    });

    it("passes when ENABLE_DEMO_SEED is 'true'", () => {
      process.env.ENABLE_DEMO_SEED = "true";
      process.argv = ["node", "test-script.mjs"];

      expect(() => assertDemoOptIn("test-script.mjs")).not.toThrow();
    });

    it("passes when --force or --yes CLI flag is passed", () => {
      delete process.env.ENABLE_DEMO_SEED;
      process.argv = ["node", "test-script.mjs", "--force"];

      expect(() => assertDemoOptIn("test-script.mjs")).not.toThrow();

      process.argv = ["node", "test-script.mjs", "--yes"];
      expect(() => assertDemoOptIn("test-script.mjs")).not.toThrow();
    });
  });
});
