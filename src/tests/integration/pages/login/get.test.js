import webserver from "@/infra/webserver.mjs";

describe("GET /login", () => {
  describe("Anonymous user", () => {
    test("Retrieving login page successfully", async () => {
      const response = await fetch(`${webserver.origin}/login`);
      expect(response.status).toBe(200);
    });
  });
});
