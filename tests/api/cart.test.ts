import { describe, it, expect } from "vitest";
import { GET, POST, PUT, DELETE } from "@/app/api/cart/route";
import { NextRequest } from "next/server";

const mockNextRequest = (body: any, method = "POST", searchParams?: Record<string, string>) => {
  const url = new URL("http://localhost/api/cart");
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return new NextRequest(url, {
    method,
    headers: new Headers({
      "Content-Type": "application/json",
    }),
    body: method !== "GET" ? JSON.stringify(body) : undefined,
  });
};

describe("Cart API", () => {
  const userId = 1;
  const carbonCreditId = 1;
  let quantity = 2;

  it("GET /api/cart returns cart items", async () => {
    const req = mockNextRequest({}, "GET", { userId: userId.toString() });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/cart returns 401 for missing userId", async () => {
    const req = mockNextRequest({}, "GET");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("POST /api/cart adds an item", async () => {
    const req = mockNextRequest({ userId, carbonCreditId, quantity }, "POST");
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("id");
    expect(data.userId).toBe(userId);
    expect(data.carbonCreditId).toBe(carbonCreditId);
  });

  it("POST /api/cart returns 400 for missing fields", async () => {
    const req = mockNextRequest({ userId }, "POST");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing fields");
  });

  it("PUT /api/cart updates item quantity", async () => {
    quantity = 5;
    const req = mockNextRequest({ userId, carbonCreditId, quantity }, "PUT");
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBeGreaterThan(0);
  });

  it("PUT /api/cart returns 400 for missing fields", async () => {
    const req = mockNextRequest({ userId }, "PUT");
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing fields");
  });

  it("DELETE /api/cart removes an item", async () => {
    const req = mockNextRequest({ userId, carbonCreditId }, "DELETE");
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("DELETE /api/cart returns 400 for missing fields", async () => {
    const req = mockNextRequest({ userId }, "DELETE");
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing fields");
  });
});
