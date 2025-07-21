import { describe, it, expect } from "vitest";
import { POST as registerPOST } from "@/app/api/auth/register/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";

const mockRequest = (body: any) => ({ json: async () => body } as Request);

describe("Auth API", () => {
  it("POST /api/auth/register returns error for existing email", async () => {
    const req = mockRequest({ email: "admin@gmail.com", password: "cos20031", firstName: "Admin", lastName: "User", company: "Test" });
    const res = await registerPOST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("POST /api/auth/login returns error for invalid credentials", async () => {
    const req = mockRequest({ email: "notfound@example.com", password: "wrongpass" });
    const res = await loginPOST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("POST /api/auth/register and /api/auth/login succeed for new user", async () => {
    const uniqueEmail = `testauth_${Date.now()}@example.com`;
    const password = "testpassword";
    const registerReq = mockRequest({
      email: uniqueEmail,
      password,
      firstName: "Test",
      lastName: "Auth",
      company: "TestCo",
    });
    const regRes = await registerPOST(registerReq);
    expect(regRes.status).toBe(200);
    const user = await regRes.json();
    expect(user.email).toBe(uniqueEmail);
    // Now login
    const loginReq = mockRequest({ email: uniqueEmail, password });
    const loginRes = await loginPOST(loginReq);
    expect(loginRes.status).toBe(200);
    const loginUser = await loginRes.json();
    expect(loginUser.email).toBe(uniqueEmail);
  });
});
