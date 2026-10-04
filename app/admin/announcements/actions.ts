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

export async function createAnnouncement(formData: FormData) {
  const user = await requireAdmin();
  const parsed = schema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    severity: formData.get("severity"),
    active: formData.get("active") === "on"
  });

  if (!parsed.success) redirect("/admin/announcements?status=invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("announcements").insert({
    ...parsed.data,
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

  if (!id.success || !parsed.success) {
    redirect("/admin/announcements?status=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("announcements")
    .update(parsed.data)
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
