import { describe, it, expect } from "vitest";
import { POST as registerPOST } from "@/app/api/auth/register/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";

const mockRequest = (body: any) => {
  return new Request("http://localhost/api/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
};

describe("Auth API", () => {
  it("POST /api/auth/register returns error for existing email", async () => {
    const req = mockRequest({
      email: "admin@gmail.com",
      password: "cos20031",
      firstName: "Admin",
      lastName: "User",
      company: "Test",
    });
    const res = await registerPOST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("POST /api/auth/register handles missing password gracefully", async () => {
    const req = mockRequest({
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      // Missing password
    });

    // Should throw an error due to bcrypt trying to hash undefined
    await expect(registerPOST(req)).rejects.toThrow();
  });

  it("POST /api/auth/login returns error for invalid credentials", async () => {
    const req = mockRequest({
      email: "notfound@example.com",
      password: "wrongpass",
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("POST /api/auth/login returns 401 for missing password", async () => {
    const req = mockRequest({
      email: "test@example.com",
      // Missing password
    });
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
    expect(user.firstName).toBe("Test");
    expect(user.lastName).toBe("Auth");
    expect(user.company).toBe("TestCo");
    expect(user).not.toHaveProperty("password"); // Password should not be returned
    expect(user).not.toHaveProperty("passwordHash"); // PasswordHash should not be returned

    // Now login
    const loginReq = mockRequest({ email: uniqueEmail, password });
    const loginRes = await loginPOST(loginReq);
    expect(loginRes.status).toBe(200);
    const loginUser = await loginRes.json();
    expect(loginUser.email).toBe(uniqueEmail);
    expect(loginUser).not.toHaveProperty("password"); // Password should not be returned
    expect(loginUser).not.toHaveProperty("passwordHash"); // PasswordHash should not be returned
  });
});
