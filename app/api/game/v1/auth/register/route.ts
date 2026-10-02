import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabasePublicClient } from "@/lib/supabase/public";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  username: z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9_]+$/),
  displayName: z.string().trim().min(1).max(32),
  password: z.string().min(8).max(72).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_registration" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: existingUsername } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", parsed.data.username)
    .maybeSingle();

  if (existingUsername) {
    return NextResponse.json({ error: "username_taken" }, { status: 409 });
  }

  const supabase = createSupabasePublicClient();
  const origin = new URL(request.url).origin;
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: origin,
      data: {
        username: parsed.data.username,
        display_name: parsed.data.displayName
      }
    }
  });

  if (error) {
    return NextResponse.json({ error: "registration_failed" }, { status: 400 });
  }

  return NextResponse.json(
    {
      userId: data.user?.id || null,
      requiresEmailVerification: !data.session,
      session: data.session
        ? {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at
          }
        : null
    },
    { status: 201 }
  );
}
