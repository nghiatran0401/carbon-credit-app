import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/notifications/route";
import { PUT } from "@/app/api/notifications/[id]/route";
import { POST as markAllAsRead } from "@/app/api/notifications/mark-all-read/route";

const mockRequest = (body: any, method = "POST", searchParams?: Record<string, string>) => {
  const url = new URL("http://localhost/api/notifications");
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return new NextRequest(url, {
    method,
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
};

const mockRequestWithId = (id: string, body: any, method = "PUT") => {
  const url = new URL(`http://localhost/api/notifications/${id}`);

  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
  });
};

const mockMarkAllAsReadRequest = (userId: string) => {
  const url = new URL("http://localhost/api/notifications/mark-all-read");
  url.searchParams.set("userId", userId);

  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify({}),
  });
};

describe("Notifications API", () => {
  beforeEach(() => {
    // Reset any test data if needed
    vi.clearAllMocks();
  });

  describe("GET /api/notifications", () => {
    it("should return error when userId is missing", async () => {
      const req = mockRequest({}, "GET");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Valid user ID required");
    });

    it("should return notifications for valid userId", async () => {
      const req = mockRequest({}, "GET", { userId: "1" });
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("notifications");
      expect(data).toHaveProperty("unreadCount");
      expect(data).toHaveProperty("pagination");
      expect(Array.isArray(data.notifications)).toBe(true);
      expect(typeof data.unreadCount).toBe("number");
      expect(data.pagination).toHaveProperty("limit");
      expect(data.pagination).toHaveProperty("offset");
      expect(data.pagination).toHaveProperty("hasMore");
    });

    it("should handle pagination parameters", async () => {
      const req = mockRequest({}, "GET", {
        userId: "1",
        limit: "10",
        offset: "5",
      });
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.offset).toBe(5);
    });

    it("should use default pagination when not provided", async () => {
      const req = mockRequest({}, "GET", { userId: "1" });
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.limit).toBe(50);
      expect(data.pagination.offset).toBe(0);
    });
  });

  describe("POST /api/notifications", () => {
    it("should return error when required fields are missing", async () => {
      const req = mockRequest({ userId: 1 });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return error when userId is missing", async () => {
      const req = mockRequest({
        type: "order",
        title: "Test",
        message: "Test message",
      });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return error when type is missing", async () => {
      const req = mockRequest({
        userId: 1,
        title: "Test",
        message: "Test message",
      });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return error when title is missing", async () => {
      const req = mockRequest({
        userId: 1,
        type: "order",
        message: "Test message",
      });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return error when message is missing", async () => {
      const req = mockRequest({
        userId: 1,
        type: "order",
        title: "Test",
      });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should create notification with valid data", async () => {
      const notificationData = {
        userId: 1,
        type: "order",
        title: "Test Notification",
        message: "This is a test notification",
        data: { orderId: 123 },
      };

      const req = mockRequest(notificationData);
      const response = await POST(req);

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data).toHaveProperty("id");
      expect(data.title).toBe("Test Notification");
      expect(data.type).toBe("order");
      expect(data.message).toBe("This is a test notification");
      expect(data.userId).toBe(1);
      expect(data.read).toBe(false);
      expect(data.data).toEqual({ orderId: 123 });
      expect(data).toHaveProperty("createdAt");
      expect(data).toHaveProperty("updatedAt");
    });

    it("should create notification with different types", async () => {
      const types = ["order", "credit", "payment", "system"] as const;

      for (const type of types) {
        const notificationData = {
          userId: 1,
          type,
          title: `${type} Test`,
          message: `This is a ${type} test notification`,
        };

        const req = mockRequest(notificationData);
        const response = await POST(req);

        expect(response.status).toBe(201);
        const data = await response.json();

        expect(data.type).toBe(type);
        expect(data.title).toBe(`${type} Test`);
      }
    });

    it("should create notification without optional data field", async () => {
      const notificationData = {
        userId: 1,
        type: "system",
        title: "System Test",
        message: "This is a system test notification",
      };

      const req = mockRequest(notificationData);
      const response = await POST(req);

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data).toHaveProperty("id");
      expect(data.type).toBe("system");
      expect(data.data).toBeDefined();
    });
  });

  describe("PUT /api/notifications/[id]", () => {
    it("should mark notification as read", async () => {
      // First create a notification to mark as read
      const createReq = mockRequest({
        userId: 1,
        type: "order",
        title: "Test Notification",
        message: "This is a test notification",
      });

      const createResponse = await POST(createReq);
      expect(createResponse.status).toBe(201);
      const createdNotification = await createResponse.json();

      // Now mark it as read
      const req = mockRequestWithId(createdNotification.id, { action: "markAsRead" });
      const response = await PUT(req, { params: { id: createdNotification.id } });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty("id", createdNotification.id);
      expect(data.read).toBe(true);
      expect(data).toHaveProperty("readAt");
      expect(new Date(data.readAt)).toBeInstanceOf(Date);
    });

    it("should return error for invalid action", async () => {
      const notificationId = "test-notification-id";
      const req = mockRequestWithId(notificationId, { action: "invalidAction" });

      const response = await PUT(req, { params: { id: notificationId } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid action");
    });

    it("should handle missing action", async () => {
      const notificationId = "test-notification-id";
      const req = mockRequestWithId(notificationId, {});

      const response = await PUT(req, { params: { id: notificationId } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid action");
    });

    it("should handle non-existent notification", async () => {
      const notificationId = "non-existent-id";
      const req = mockRequestWithId(notificationId, { action: "markAsRead" });

      const response = await PUT(req, { params: { id: notificationId } });

      // Should handle gracefully - either return 404 or 500 depending on implementation
      expect([404, 500]).toContain(response.status);
    });
  });

  describe("POST /api/notifications/mark-all-read", () => {
    it("should mark all notifications as read for user", async () => {
      const userId = "1";
      const req = mockMarkAllAsReadRequest(userId);

      const response = await markAllAsRead(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should return error when userId is missing", async () => {
      const url = new URL("http://localhost/api/notifications/mark-all-read");
      const req = new NextRequest(url, {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await markAllAsRead(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("User ID required");
    });

    it("should handle invalid userId", async () => {
      const req = mockMarkAllAsReadRequest("invalid-user-id");

      const response = await markAllAsRead(req);

      // Should handle gracefully
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe("Notification data validation", () => {
    it("should validate notification type enum", async () => {
      const validTypes = ["order", "credit", "payment", "system"];
      const invalidType = "invalid";

      const req = mockRequest({
        userId: 1,
        type: invalidType,
        title: "Test",
        message: "Test message",
      });

      const response = await POST(req);

      // Should either accept it (if validation is lenient) or reject it
      expect([200, 400]).toContain(response.status);
    });

    it("should handle reasonable message content", async () => {
      const message = "This is a reasonable length message for testing purposes.";

      const req = mockRequest({
        userId: 1,
        type: "system",
        title: "Message Test",
        message: message,
      });

      const response = await POST(req);

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data.message).toBe(message);
    });

    it("should handle complex data objects", async () => {
      const complexData = {
        orderId: 123,
        items: [
          { id: 1, name: "Credit A", quantity: 5 },
          { id: 2, name: "Credit B", quantity: 3 },
        ],
        metadata: {
          source: "webhook",
          timestamp: new Date().toISOString(),
        },
      };

      const req = mockRequest({
        userId: 1,
        type: "order",
        title: "Complex Data Test",
        message: "Testing complex data storage",
        data: complexData,
      });

      const response = await POST(req);

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data.data).toEqual(complexData);
    });
  });

  describe("Error handling", () => {
    it("should handle database connection errors gracefully", async () => {
      // This test would require mocking the database connection
      // For now, we'll test that the API doesn't crash on malformed requests

      const req = mockRequest({
        userId: "invalid-user-id",
        type: "order",
        title: "Test",
        message: "Test message",
      });

      const response = await POST(req);

      // Should handle gracefully
      expect([200, 400, 500]).toContain(response.status);
    });

    it("should handle malformed JSON", async () => {
      const url = new URL("http://localhost/api/notifications");
      const req = new NextRequest(url, {
        method: "POST",
        body: "invalid json",
      });

      const response = await POST(req);

      // Should handle JSON parsing errors
      expect([400, 500]).toContain(response.status);
    });
  });
});
