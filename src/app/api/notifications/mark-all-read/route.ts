import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/lib/notification-service";

function getUserId(req: NextRequest): number | null {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  return userId ? parseInt(userId) : null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    await notificationService.markAllAsRead(userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
