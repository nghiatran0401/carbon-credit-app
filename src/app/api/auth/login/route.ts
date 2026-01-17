import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * This endpoint is not needed for Supabase auth
 * Login happens entirely client-side via supabase.auth.signInWithPassword()
 *
 * This endpoint can be used to verify the current session and get user info
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !supabaseUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      id: supabaseUser.id,
      email: supabaseUser.email,
      emailVerified: supabaseUser.email_confirmed_at !== null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Authentication check failed" }, { status: 500 });
  }
}
