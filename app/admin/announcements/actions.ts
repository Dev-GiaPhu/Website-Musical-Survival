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
