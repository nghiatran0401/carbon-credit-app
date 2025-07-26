import { describe, it, expect } from "vitest";
import { GET, POST, PUT, DELETE } from "@/app/api/forests/route";

const mockRequest = (body: any) => {
  return new Request("http://localhost/api/forests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
};

describe("Forests API", () => {
  let forestId: number | undefined;

  it("GET /api/forests returns forests", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("id");
      expect(data[0]).toHaveProperty("name");
      expect(data[0]).toHaveProperty("location");
      expect(data[0]).toHaveProperty("type");
      expect(data[0]).toHaveProperty("area");
      expect(data[0]).toHaveProperty("status");
    }
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
    expect(data.location).toBe("Test Location");
    expect(data.type).toBe("Rainforest");
    expect(data.area).toBe(123.45);
    expect(data.status).toBe("active");
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
    expect(data.location).toBe("Updated Location");
    expect(data.status).toBe("inactive");
    expect(data.area).toBe(543.21);
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
