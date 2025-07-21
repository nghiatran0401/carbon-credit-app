import { describe, it, expect } from "vitest";
import { POST as cartPOST, GET as cartGET } from "@/app/api/cart/route";
import { POST as checkoutPOST } from "@/app/api/checkout/route";
import { GET as ordersGET } from "@/app/api/orders/route";

const userId = 1;
const carbonCreditId = 1;
const quantity = 2;

const mockRequest = (body: any, method = "POST") =>
  ({
    json: async () => body,
    headers: new Map(),
    nextUrl: { searchParams: new Map(Object.entries(body)) },
    method,
  } as any);

describe("E2E Stripe Checkout Flow", () => {
  it("should add to cart, checkout, create order, and clear cart", async () => {
    // 1. Add to cart
    let req = mockRequest({ userId, carbonCreditId, quantity }, "POST");
    let res: any = await cartPOST(req);
    expect(res.status).toBe(200);
    let data = await res.json();
    expect(data).toHaveProperty("id");

    // 2. Checkout
    req = mockRequest({ userId }, "POST");
    res = await checkoutPOST(req);
    expect(res.status).toBe(200);
    data = await res.json();
    expect(data).toHaveProperty("clientSecret");
    expect(typeof data.clientSecret).toBe("string");
    expect(data.clientSecret.length).toBeGreaterThan(10);
    expect(data).toHaveProperty("orderId");
    const orderId = data.orderId;

    // 3. Assert order is created
    res = await ordersGET(new Request(`http://localhost/api/orders?userId=${userId}`));
    expect(res.status).toBe(200);
    data = await res.json();
    const found = data.find((o: any) => o.id === orderId);
    expect(found).toBeDefined();
    expect(found.status).toBe("pending");
    expect(found.items.length).toBeGreaterThan(0);

    // 4. Assert cart is cleared
    req = mockRequest({ userId }, "GET");
    res = await cartGET(req);
    expect(res.status).toBe(200);
    data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });
});
