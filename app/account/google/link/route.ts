import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.redirect(new URL("/auth", url.origin));
  }

  const { data, error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: {
      redirectTo: `${url.origin}/auth/callback?next=/account?status=google-linked`,
      queryParams: {
        prompt: "select_account"
      }
    }
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/account?status=google-link-error", url.origin));
  }

  return NextResponse.redirect(data.url);
}
