import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/users/route";
import { POST as registerPOST } from "@/app/api/auth/register/route";

const mockRequest = (body: any) => {
  return new Request("http://localhost/api/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
};

describe("Users API", () => {
  it("GET /api/users returns users", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("email");
      expect(data[0]).toHaveProperty("id");
      expect(data[0]).toHaveProperty("firstName");
      expect(data[0]).toHaveProperty("lastName");
      expect(data[0]).toHaveProperty("role");
      expect(data[0]).toHaveProperty("createdAt");
      expect(data[0]).toHaveProperty("updatedAt");
      expect(data[0]).toHaveProperty("passwordHash"); // API returns passwordHash
      expect(data[0]).not.toHaveProperty("password"); // But not plain password
    }
  });

  it("GET /api/users returns users with proper structure", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);

    // Check that all users have the required structure
    data.forEach((user: any) => {
      expect(typeof user.id).toBe("number");
      expect(typeof user.email).toBe("string");
      expect(typeof user.firstName).toBe("string");
      expect(typeof user.lastName).toBe("string");
      expect(typeof user.role).toBe("string");
      expect(typeof user.createdAt).toBe("string");
      expect(typeof user.updatedAt).toBe("string");
      expect(typeof user.passwordHash).toBe("string"); // passwordHash is returned
      expect(user).not.toHaveProperty("password"); // But not plain password
    });
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
    expect(user.firstName).toBe("Test");
    expect(user.lastName).toBe("User");
    expect(user.company).toBe("TestCo");
    expect(user).not.toHaveProperty("password");
    expect(user).not.toHaveProperty("passwordHash"); // Register API excludes passwordHash

    // Now check GET /api/users includes this user
    const getRes = await GET();
    const users = await getRes.json();
    const found = users.find((u: any) => u.email === uniqueEmail);
    expect(found).toBeDefined();
    expect(found.firstName).toBe("Test");
    expect(found.lastName).toBe("User");
    expect(found.company).toBe("TestCo");
    expect(found).not.toHaveProperty("password");
    expect(found).toHaveProperty("passwordHash"); // But users API includes passwordHash
  });
});
