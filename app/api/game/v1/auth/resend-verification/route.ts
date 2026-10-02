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
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: origin
    }
  });

  if (error) {
    return NextResponse.json({ error: "resend_failed" }, { status: 429 });
  }

  return NextResponse.json({ sent: true });
}
