"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  content: z.string().trim().min(3).max(1000),
  severity: z.enum(["info", "warning", "important"]),
  active: z.boolean()
});

const idSchema = z.string().uuid();

function parseOptionalVietnamDateTime(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return undefined;
  const date = new Date(`${raw}:00+07:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export async function createAnnouncement(formData: FormData) {
  const user = await requireAdmin();
  const parsed = schema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    severity: formData.get("severity"),
    active: formData.get("active") === "on"
  });

  const startsAt = parseOptionalVietnamDateTime(formData.get("startsAt"));
  const endsAt = parseOptionalVietnamDateTime(formData.get("endsAt"));

  if (
    !parsed.success ||
    startsAt === undefined ||
    endsAt === undefined ||
    (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime())
  ) {
    redirect("/admin/announcements?status=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("announcements").insert({
    ...parsed.data,
    starts_at: startsAt,
    ends_at: endsAt,
    author_id: user.id
  });

  if (error) redirect("/admin/announcements?status=error");

  revalidatePath("/");
  redirect("/admin/announcements?status=saved");
}


export async function updateAnnouncement(formData: FormData) {
  await requireAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  const parsed = schema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    severity: formData.get("severity"),
    active: formData.get("active") === "on"
  });

  const startsAt = parseOptionalVietnamDateTime(formData.get("startsAt"));
  const endsAt = parseOptionalVietnamDateTime(formData.get("endsAt"));

  if (
    !id.success ||
    !parsed.success ||
    startsAt === undefined ||
    endsAt === undefined ||
    (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime())
  ) {
    redirect("/admin/announcements?status=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("announcements")
    .update({
      ...parsed.data,
      starts_at: startsAt,
      ends_at: endsAt
    })
    .eq("id", id.data);

  if (error) redirect(`/admin/announcements/${id.data}?status=error`);

  revalidatePath("/");
  revalidatePath("/admin/announcements");
  revalidatePath(`/admin/announcements/${id.data}`);
  redirect(`/admin/announcements/${id.data}?status=updated`);
}

export async function toggleAnnouncement(formData: FormData) {
  await requireAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  const active = formData.get("active") === "true";
  if (!id.success) redirect("/admin/announcements?status=invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("announcements")
    .update({ active })
    .eq("id", id.data);

  if (error) redirect("/admin/announcements?status=error");

  revalidatePath("/");
  revalidatePath("/admin/announcements");
  redirect("/admin/announcements?status=updated");
}

export async function deleteAnnouncement(formData: FormData) {
  await requireAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) redirect("/admin/announcements?status=invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id.data);

  if (error) redirect(`/admin/announcements/${id.data}?status=delete-error`);

  revalidatePath("/");
  revalidatePath("/admin/announcements");
  redirect("/admin/announcements?status=deleted");
}
