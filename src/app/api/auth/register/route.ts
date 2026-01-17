import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Create user record in database after Supabase auth signup
 *
 * NOTE: This endpoint is now optional/fallback. The database trigger
 * (handle_new_user) should automatically create User records when
 * users sign up via Supabase Auth. This endpoint can be used as a
 * fallback if the trigger fails or for manual user creation.
 *
 * @deprecated Prefer using database trigger for automatic user creation
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, supabaseUserId, firstName, lastName, company } = body;

    console.log("Register API called (fallback/optional):", { email, supabaseUserId, firstName, lastName, company });
    console.warn("Note: Database trigger should handle user creation automatically. This endpoint is a fallback.");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!supabaseUserId) {
      return NextResponse.json({ error: "Supabase user ID is required" }, { status: 400 });
    }

    // Generate default names from email if not provided
    const emailParts = email.split("@")[0].split(".");
    const finalFirstName = firstName || emailParts[0] || "User";
    const finalLastName = lastName || emailParts.slice(1).join(" ") || "";

    // Note: User verification is skipped in fallback mode
    // The database trigger should handle user creation automatically
    // This endpoint is only for edge cases or manual user creation

    // Check if user already exists in database (by email or supabaseUserId)
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const existingBySupabaseId = await prisma.user.findUnique({ where: { supabaseUserId } });
    if (existingBySupabaseId) {
      return NextResponse.json({ error: "User with this Supabase ID already exists" }, { status: 400 });
    }

    // Create database user record linked to Supabase user
    console.log("Creating user with data:", {
      email,
      supabaseUserId,
      firstName: finalFirstName,
      lastName: finalLastName,
      company: company || null,
      emailVerified: true,
    });

    const user = await prisma.user.create({
      data: {
        email,
        supabaseUserId, // Link to Supabase Auth user
        firstName: finalFirstName,
        lastName: finalLastName,
        company: company || null,
        emailVerified: true, // Auto-confirm means verified
      },
    });

    console.log("User created successfully:", user.id);
    const { supabaseUserId: _, ...userInfo } = user;
    return NextResponse.json(userInfo);
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
  }
}
