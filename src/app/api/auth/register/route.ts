import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * Create user record in database after Supabase auth signup
 * This endpoint is called after successful Supabase signup
 */
export async function POST(req: Request) {
  try {
    const { email, firstName, lastName, company } = await req.json();
    
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, first name, and last name are required" },
        { status: 400 }
      );
    }

    // Verify Supabase user exists (created by client-side signup)
    const supabase = await createClient();
    const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.getUser();
    
    if (supabaseError || !supabaseUser || supabaseUser.email !== email) {
      return NextResponse.json(
        { error: "Supabase authentication required. Please sign up first." },
        { status: 401 }
      );
    }

    // Check if user already exists in database
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
  }

    // Create database user record linked to Supabase user
  const user = await prisma.user.create({
      data: {
        email,
        supabaseUserId: supabaseUser.id,
        firstName,
        lastName,
        company,
        emailVerified: supabaseUser.email_confirmed_at !== null,
      },
  });
    
    const { supabaseUserId, ...userInfo } = user;
  return NextResponse.json(userInfo);
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "Registration failed" },
      { status: 500 }
    );
  }
}
