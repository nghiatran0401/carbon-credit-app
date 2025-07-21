import { describe, it, expect } from "vitest";
import { GET, POST, PUT, DELETE } from "@/app/api/forests/route";
import { NextRequest } from "next/server";

const mockRequest = (body: any) => ({ json: async () => body } as Request);

describe("Forests API", () => {
  let forestId: number | undefined;

  it("GET /api/forests returns forests", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("POST /api/forests creates a forest", async () => {
    const now = new Date();
    const req = mockRequest({
      name: "Test Forest",
      location: "Test Location",
      type: "Rainforest",
      area: 123.45,
      description: "A test forest for mutation tests.",
      status: "active",
      lastUpdated: now.toISOString(),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("id");
    expect(data.name).toBe("Test Forest");
    forestId = data.id;
  });

  it("PUT /api/forests updates a forest", async () => {
    expect(forestId).toBeDefined();
    const req = mockRequest({
      id: forestId,
      name: "Updated Forest",
      location: "Updated Location",
      type: "Rainforest",
      area: 543.21,
      description: "Updated description.",
      status: "inactive",
      lastUpdated: new Date().toISOString(),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Updated Forest");
    expect(data.status).toBe("inactive");
  });

  it("DELETE /api/forests deletes a forest", async () => {
    expect(forestId).toBeDefined();
    const req = mockRequest({ id: forestId });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
