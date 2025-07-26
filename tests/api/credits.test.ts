import { describe, it, expect } from "vitest";
import { GET, POST, PUT, DELETE } from "@/app/api/credits/route";

const mockRequest = (body: any) => {
  return new Request("http://localhost/api/credits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
};

describe("Credits API", () => {
  let creditId: number | undefined;

  it("GET /api/credits returns credits", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("id");
      expect(data[0]).toHaveProperty("forestId");
      expect(data[0]).toHaveProperty("vintage");
      expect(data[0]).toHaveProperty("certification");
      expect(data[0]).toHaveProperty("totalCredits");
      expect(data[0]).toHaveProperty("availableCredits");
      expect(data[0]).toHaveProperty("pricePerCredit");
    }
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
    expect(data.vintage).toBe(2024);
    expect(data.certification).toBe("Gold Standard");
    expect(data.totalCredits).toBe(1000);
    expect(data.availableCredits).toBe(1000);
    expect(data.pricePerCredit).toBe(10.5);
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
