import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedTypes = new Set<EmailOtpType>([
  "email",
  "recovery",
  "invite",
  "email_change",
  "signup",
  "magiclink"
]);

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account";
  }

  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const rawType = url.searchParams.get("type");
  const next = safeNext(url.searchParams.get("next"));

  if (!tokenHash || !rawType || !allowedTypes.has(rawType as EmailOtpType)) {
    return NextResponse.redirect(
      new URL("/auth?mode=login&error=invalid-verification-link", url.origin)
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: rawType as EmailOtpType
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/auth?mode=login&error=verification-failed", url.origin)
    );
  }

  if (rawType === "recovery") {
    return NextResponse.redirect(new URL("/auth/reset-password", url.origin));
  }

  if (rawType === "email_change") {
    const { data } = await supabase.auth.getUser();
    const pendingEmail = (data.user as (typeof data.user & { new_email?: string }) | null)
      ?.new_email;

    return NextResponse.redirect(
      new URL(
        pendingEmail
          ? "/account?status=email-confirmed-one"
          : "/account?status=email-changed",
        url.origin
      )
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
