import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabasePublicClient } from "@/lib/supabase/public";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const supabase = createSupabasePublicClient();
  const origin = new URL(request.url).origin;

  // Always return the same public response to avoid exposing whether an email exists.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: origin
  });

  return NextResponse.json({ sent: true });
}
