import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/account`,
      queryParams: {
        prompt: "select_account"
      }
    }
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/auth?mode=login&error=oauth`);
  }

  return NextResponse.redirect(data.url);
}
