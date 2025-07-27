import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/lib/notification-service";

function getUserId(req: NextRequest): number | null {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return null;

    const parsedUserId = parseInt(userId);
    return isNaN(parsedUserId) || parsedUserId <= 0 ? null : parsedUserId;
  } catch (error) {
    console.error("Error parsing user ID:", error);
    return null;
  }
}

function validatePaginationParams(limit: string | null, offset: string | null): { limit: number; offset: number } {
  const parsedLimit = limit ? parseInt(limit) : 50;
  const parsedOffset = offset ? parseInt(offset) : 0;

  return {
    limit: Math.max(1, Math.min(100, isNaN(parsedLimit) ? 50 : parsedLimit)),
    offset: Math.max(0, isNaN(parsedOffset) ? 0 : parsedOffset),
  };
}

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Valid user ID required" }, { status: 400 });
    }

    const url = new URL(req.url);
    const { limit, offset } = validatePaginationParams(url.searchParams.get("limit"), url.searchParams.get("offset"));

    const [notifications, unreadCount] = await Promise.all([notificationService.getUserNotifications(userId, limit, offset), notificationService.getUnreadCount(userId)]);

    return NextResponse.json({
      notifications,
      unreadCount,
      pagination: {
        limit,
        offset,
        hasMore: notifications.length === limit,
        total: notifications.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);

    // Don't expose internal errors to client
    const message = error.message?.includes("Invalid") ? error.message : "Failed to fetch notifications";

    return NextResponse.json({ error: message }, { status: error.message?.includes("Invalid") ? 400 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { userId, type, title, message, data } = body;

    // Validate required fields
    const missingFields = [];
    if (!userId) missingFields.push("userId");
    if (!type) missingFields.push("type");
    if (!title) missingFields.push("title");
    if (!message) missingFields.push("message");

    if (missingFields.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missingFields.join(", ")}` }, { status: 400 });
    }

    // Validate field types
    if (typeof userId !== "number" || userId <= 0) {
      return NextResponse.json({ error: "userId must be a positive number" }, { status: 400 });
    }

    if (typeof type !== "string" || !["order", "credit", "system", "payment"].includes(type)) {
      return NextResponse.json({ error: "type must be one of: order, credit, system, payment" }, { status: 400 });
    }

    if (typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "title must be a non-empty string" }, { status: 400 });
    }

    if (typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "message must be a non-empty string" }, { status: 400 });
    }

    const notification = await notificationService.createNotification({
      userId,
      type: type as "order" | "credit" | "system" | "payment",
      title: title.trim(),
      message: message.trim(),
      data: data || {},
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error: any) {
    console.error("Error creating notification:", error);

    // Handle validation errors
    if (error.message?.includes("Invalid") || error.message?.includes("required")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}
