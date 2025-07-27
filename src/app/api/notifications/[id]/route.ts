import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/lib/notification-service";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { action } = body;

    if (action === "markAsRead") {
      const notification = await notificationService.markAsRead(id);
      return NextResponse.json(notification);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error updating notification:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
