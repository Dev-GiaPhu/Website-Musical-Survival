"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  eventId: z.string().uuid(),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(100),
  submission: z.string().trim().min(1).max(4000)
});

export async function submitEventEntry(formData: FormData) {
  await requireUser();

  const parsed = schema.safeParse({
    eventId: formData.get("eventId"),
    slug: formData.get("slug"),
    submission: formData.get("submission")
  });

  if (!parsed.success) {
    redirect("/events?status=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("submit_game_event_entry", {
    target_event_id: parsed.data.eventId,
    submission_text: parsed.data.submission
  });

  if (error) {
    let code = "submit-error";
    if (error.message.includes("ALREADY_SUBMITTED")) code = "already-submitted";
    if (error.message.includes("EVENT_NOT_STARTED")) code = "not-started";
    if (error.message.includes("EVENT_ENDED")) code = "ended";
    if (error.message.includes("EVENT_FULL")) code = "full";
    redirect(`/events/${parsed.data.slug}?status=${code}`);
  }

  revalidatePath(`/events/${parsed.data.slug}`);
  redirect(`/events/${parsed.data.slug}?status=submitted`);
}
