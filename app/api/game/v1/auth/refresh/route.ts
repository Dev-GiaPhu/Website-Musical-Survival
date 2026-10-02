import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabasePublicClient } from "@/lib/supabase/public";

const schema = z.object({
  refreshToken: z.string().min(20).max(4096)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_refresh_token" }, { status: 400 });
  }

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: parsed.data.refreshToken
  });

  if (error || !data.session || !data.user) {
    return NextResponse.json({ error: "session_expired" }, { status: 401 });
  }

  return NextResponse.json({
    userId: data.user.id,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at
  });
}
