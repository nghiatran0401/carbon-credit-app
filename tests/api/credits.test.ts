import { describe, it, expect } from "vitest";
import { GET, POST, PUT, DELETE } from "@/app/api/credits/route";

const mockRequest = (body: any) => ({ json: async () => body } as Request);

describe("Credits API", () => {
  let creditId: number | undefined;

  it("GET /api/credits returns credits", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("POST /api/credits creates a credit", async () => {
    // Use forestId 1 for test, adjust if needed
    const req = mockRequest({
      forestId: 1,
      vintage: 2024,
      certification: "Gold Standard",
      totalCredits: 1000,
      availableCredits: 1000,
      pricePerCredit: 10.5,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("id");
    expect(data.forestId).toBe(1);
    creditId = data.id;
  });

  it("PUT /api/credits updates a credit", async () => {
    expect(creditId).toBeDefined();
    const req = mockRequest({
      id: creditId,
      certification: "VCS",
      pricePerCredit: 12.0,
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.certification).toBe("VCS");
    expect(data.pricePerCredit).toBe(12.0);
  });

  it("DELETE /api/credits deletes a credit", async () => {
    expect(creditId).toBeDefined();
    const req = mockRequest({ id: creditId });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
