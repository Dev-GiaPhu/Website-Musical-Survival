import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabasePublicClient } from "@/lib/supabase/public";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_login" }, { status: 400 });
  }

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.session || !data.user) {
    const message = error?.message.toLowerCase() || "";
    if (message.includes("email not confirmed")) {
      return NextResponse.json({ error: "email_not_verified" }, { status: 403 });
    }
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  return NextResponse.json({
    userId: data.user.id,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at
  });
}
