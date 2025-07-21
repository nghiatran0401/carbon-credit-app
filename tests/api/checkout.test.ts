import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/checkout/route";

const mockRequest = (body: any) =>
  ({
    json: async () => body,
    headers: new Map(),
    nextUrl: { searchParams: new Map(Object.entries(body)) },
    method: "POST",
  } as any);

describe("Checkout API", () => {
  const userId = 1;

  it("POST /api/checkout creates a Stripe PaymentIntent", async () => {
    const req = mockRequest({ userId });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("clientSecret");
    expect(typeof data.clientSecret).toBe("string");
    expect(data.clientSecret.length).toBeGreaterThan(10);
  });
});
