import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notificationService } from "@/lib/notification-service";

export async function GET() {
  const credits = await prisma.carbonCredit.findMany({
    include: {
      forest: true,
    },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(credits);
}

export async function POST(req: Request) {
  const data = await req.json();
  const credit = await prisma.carbonCredit.create({
    data,
    include: {
      forest: true,
    },
  });

  // Create notification for new credits
  try {
    // Get all users who might be interested in new credits
    const users = await prisma.user.findMany({
      where: {
        role: "USER", // Only notify regular users, not admins
      },
    });

    // Create notifications for each user
    for (const user of users) {
      try {
        await notificationService.createCreditNotification(user.id, credit.id, credit.forest?.name || "Unknown Forest", `New ${credit.certification} credits available (${credit.availableCredits} credits)`);
      } catch (error) {
        console.error(`Failed to create notification for user ${user.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error creating credit notifications:", error);
  }

  return NextResponse.json(credit);
}

export async function PUT(req: Request) {
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const credit = await prisma.carbonCredit.update({ where: { id }, data });
  return NextResponse.json(credit);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.carbonCredit.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
