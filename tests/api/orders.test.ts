import { describe, it, expect } from "vitest";
import { GET, POST, PUT, DELETE } from "@/app/api/orders/route";

const mockRequest = (body: any, url = "http://localhost/api/orders") => {
  const requestUrl = new URL(url);
  return new Request(requestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
};

const mockGetRequest = (url = "http://localhost/api/orders") => {
  return new Request(url);
};

describe("Orders API", () => {
  let orderId: number | undefined;

  it("GET /api/orders returns orders", async () => {
    const req = mockGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/orders with userId filter returns user orders", async () => {
    const req = mockGetRequest("http://localhost/api/orders?userId=1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/orders includes orderHistory and payments", async () => {
    const req = mockGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      const order = data[0];
      expect(order).toHaveProperty("orderHistory");
      expect(order).toHaveProperty("payments");
      expect(Array.isArray(order.orderHistory)).toBe(true);
      expect(Array.isArray(order.payments)).toBe(true);
    }
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
    expect(data).toHaveProperty("totalPrice");
    expect(data.items).toHaveLength(1);
    orderId = data.id;
  });

  it("POST /api/orders creates order with multiple items", async () => {
    const req = mockRequest({
      userId: 1,
      status: "pending",
      items: [
        {
          carbonCreditId: 1,
          quantity: 5,
          pricePerCredit: 10.5,
        },
        {
          carbonCreditId: 2,
          quantity: 3,
          pricePerCredit: 15.0,
        },
      ],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toHaveLength(2);
    expect(data.totalPrice).toBeGreaterThan(0);
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

  it("PUT /api/orders returns 400 for missing id", async () => {
    const req = mockRequest({
      status: "completed",
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing id");
  });

  it("DELETE /api/orders deletes an order", async () => {
    expect(orderId).toBeDefined();
    const req = mockRequest({ id: orderId });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("DELETE /api/orders returns 400 for missing id", async () => {
    const req = mockRequest({});
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing id");
  });
});
