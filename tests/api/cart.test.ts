import { describe, it, expect } from "vitest";
import { GET, POST, PUT, DELETE } from "@/app/api/cart/route";

const mockRequest = (body: any, method = "POST") =>
  ({
    json: async () => body,
    headers: new Map(),
    nextUrl: { searchParams: new Map(Object.entries(body)) },
    method,
  } as any);

describe("Cart API", () => {
  const userId = 1;
  const carbonCreditId = 1; // Adjust if needed to match seed data
  let quantity = 2;

  it("GET /api/cart returns cart items", async () => {
    const req = mockRequest({ userId }, "GET");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("POST /api/cart adds an item", async () => {
    const req = mockRequest({ userId, carbonCreditId, quantity }, "POST");
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("id");
    expect(data.userId).toBe(userId);
    expect(data.carbonCreditId).toBe(carbonCreditId);
  });

  it("PUT /api/cart updates item quantity", async () => {
    quantity = 5;
    const req = mockRequest({ userId, carbonCreditId, quantity }, "PUT");
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBeGreaterThan(0);
  });

  it("DELETE /api/cart removes an item", async () => {
    const req = mockRequest({ userId, carbonCreditId }, "DELETE");
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
