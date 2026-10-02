"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const slugify = (input: string) =>
  input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);

function parseVietnamDateTime(value: unknown) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const baseEventSchema = z.object({
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(3).max(280),
  rules: z.string().trim().min(3).max(12000),
  submissionPrompt: z.string().trim().min(1).max(120),
  rewardDescription: z.string().trim().max(500).optional(),
  maxEntries: z.union([z.literal(""), z.coerce.number().int().positive().max(1000000)])
});

function adminEventRedirect(path: string, status: string): never {
  redirect(`${path}?status=${encodeURIComponent(status)}`);
}

export async function createEvent(formData: FormData) {
  const user = await requireAdmin();

  const parsed = baseEventSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    rules: formData.get("rules"),
    submissionPrompt: formData.get("submissionPrompt"),
    rewardDescription: String(formData.get("rewardDescription") || ""),
    maxEntries: String(formData.get("maxEntries") || "")
  });
  const startsAt = parseVietnamDateTime(formData.get("startsAt"));
  const endsAt = parseVietnamDateTime(formData.get("endsAt"));

  if (!parsed.success || !startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) {
    adminEventRedirect("/admin/events", "invalid");
  }

  const supabase = await createSupabaseServerClient();
  const baseSlug = slugify(parsed.data.title) || "su-kien";
  const slug = `${baseSlug}-${Date.now().toString(36)}`;
  const { data, error } = await supabase
    .from("game_events")
    .insert({
      slug,
      title: parsed.data.title,
      summary: parsed.data.summary,
      rules: parsed.data.rules,
      submission_prompt: parsed.data.submissionPrompt,
      reward_description: parsed.data.rewardDescription || null,
      starts_at: startsAt,
      ends_at: endsAt,
      max_entries: parsed.data.maxEntries === "" ? null : parsed.data.maxEntries,
      status: formData.get("published") === "on" ? "published" : "draft",
      created_by: user.id
    })
    .select("id")
    .single();

  if (error || !data) adminEventRedirect("/admin/events", "error");

  revalidatePath("/");
  revalidatePath("/events");
  redirect(`/admin/events/${data.id}?status=created`);
}

export async function updateEvent(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("eventId") || "");
  if (!z.string().uuid().safeParse(eventId).success) adminEventRedirect("/admin/events", "invalid");

  const parsed = baseEventSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    rules: formData.get("rules"),
    submissionPrompt: formData.get("submissionPrompt"),
    rewardDescription: String(formData.get("rewardDescription") || ""),
    maxEntries: String(formData.get("maxEntries") || "")
  });
  const startsAt = parseVietnamDateTime(formData.get("startsAt"));
  const endsAt = parseVietnamDateTime(formData.get("endsAt"));
  const status = z.enum(["draft", "published", "closed"]).safeParse(formData.get("eventStatus"));

  if (!parsed.success || !startsAt || !endsAt || !status.success || new Date(endsAt) <= new Date(startsAt)) {
    adminEventRedirect(`/admin/events/${eventId}`, "invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("game_events")
    .update({
      title: parsed.data.title,
      summary: parsed.data.summary,
      rules: parsed.data.rules,
      submission_prompt: parsed.data.submissionPrompt,
      reward_description: parsed.data.rewardDescription || null,
      starts_at: startsAt,
      ends_at: endsAt,
      max_entries: parsed.data.maxEntries === "" ? null : parsed.data.maxEntries,
      status: status.data
    })
    .eq("id", eventId);

  if (error) adminEventRedirect(`/admin/events/${eventId}`, "error");

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/admin/events/${eventId}`);
  adminEventRedirect(`/admin/events/${eventId}`, "updated");
}

export async function awardEventEntry(formData: FormData) {
  await requireAdmin();
  const eventId = z.string().uuid().safeParse(formData.get("eventId"));
  const entryId = z.string().uuid().safeParse(formData.get("entryId"));
  const amount = z.coerce.number().int().positive().max(1000000000).safeParse(formData.get("amount"));
  const note = z.string().trim().min(3).max(500).safeParse(formData.get("note"));

  if (!eventId.success || !entryId.success || !amount.success || !note.success) {
    adminEventRedirect("/admin/events", "invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_award_event_entry", {
    target_entry_id: entryId.data,
    reward_amount: amount.data,
    note: note.data
  });

  if (error) {
    adminEventRedirect(`/admin/events/${eventId.data}`, "award-error");
  }

  revalidatePath(`/admin/events/${eventId.data}`);
  adminEventRedirect(`/admin/events/${eventId.data}`, "awarded");
}

export async function markEntryNotSelected(formData: FormData) {
  const user = await requireAdmin();
  const eventId = z.string().uuid().safeParse(formData.get("eventId"));
  const entryId = z.string().uuid().safeParse(formData.get("entryId"));
  const note = z.string().trim().max(500).safeParse(String(formData.get("note") || ""));

  if (!eventId.success || !entryId.success || !note.success) {
    adminEventRedirect("/admin/events", "invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("game_event_entries")
    .update({
      status: "not_selected",
      admin_note: note.data || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id
    })
    .eq("id", entryId.data)
    .eq("event_id", eventId.data);

  if (error) adminEventRedirect(`/admin/events/${eventId.data}`, "review-error");

  revalidatePath(`/admin/events/${eventId.data}`);
  adminEventRedirect(`/admin/events/${eventId.data}`, "reviewed");
}
