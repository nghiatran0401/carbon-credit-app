import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password, firstName, lastName, company } = await req.json();
    
    // Check if user already exists in database
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    // Verify Supabase user exists (created by client-side signup)
    const supabase = await createClient();
    const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.getUser();
    
    // Create database user record
    // Note: Password hash is still stored for backward compatibility, but Supabase handles auth
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, firstName, lastName, company },
    });
    
    const { passwordHash: _, ...userInfo } = user;
    return NextResponse.json(userInfo);
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
  }
}
