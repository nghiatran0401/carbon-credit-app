import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/users/route";
import { POST as registerPOST } from "@/app/api/auth/register/route";

const mockRequest = (body: any) => ({ json: async () => body } as Request);

describe("Users API", () => {
  it("GET /api/users returns users", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("email");
      expect(data[0]).toHaveProperty("id");
    }
  });

  it("POST /api/auth/register creates a new user and GET /api/users includes it", async () => {
    const uniqueEmail = `testuser_${Date.now()}@example.com`;
    const req = mockRequest({
      email: uniqueEmail,
      password: "testpassword",
      firstName: "Test",
      lastName: "User",
      company: "TestCo",
    });
    const res = await registerPOST(req);
    expect(res.status).toBe(200);
    const user = await res.json();
    expect(user.email).toBe(uniqueEmail);
    // Now check GET /api/users includes this user
    const getRes = await GET();
    const users = await getRes.json();
    const found = users.find((u: any) => u.email === uniqueEmail);
    expect(found).toBeDefined();
  });
});
