import { describe, it, expect } from "vitest";
import { GET, POST, PUT, DELETE } from "@/app/api/orders/route";

const mockRequest = (body: any) => ({ json: async () => body } as Request);

describe("Orders API", () => {
  let orderId: number | undefined;

  it("GET /api/orders returns orders", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("POST /api/orders creates an order", async () => {
    // Use userId 1 and carbonCreditId 1 for test, adjust if needed
    const req = mockRequest({
      userId: 1,
      status: "pending",
      items: [
        {
          carbonCreditId: 1,
          quantity: 10,
          pricePerCredit: 10.5,
        },
      ],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("id");
    expect(data.userId).toBe(1);
    orderId = data.id;
  });

  it("PUT /api/orders updates an order", async () => {
    expect(orderId).toBeDefined();
    const req = mockRequest({
      id: orderId,
      status: "completed",
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("completed");
  });

  it("DELETE /api/orders deletes an order", async () => {
    expect(orderId).toBeDefined();
    const req = mockRequest({ id: orderId });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
