import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase Auth PKCE code exchange. No arbitrary redirect URL is accepted.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/", url.origin));
    }
  }
  return NextResponse.redirect(new URL("/sign-in?error=auth", url.origin));
}
