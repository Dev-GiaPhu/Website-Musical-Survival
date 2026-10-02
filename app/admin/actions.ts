"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { newsSchema } from "@/lib/validation";

function slugify(input: string) {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);

  return `${base || "thong-bao"}-${Date.now().toString(36)}`;
}

export async function publishNews(formData: FormData) {
  const user = await requireAdmin();
  const parsed = newsSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    content: formData.get("content"),
    published: formData.get("published") === "on"
  });

  if (!parsed.success) redirect("/admin?status=invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("news_posts").insert({
    slug: slugify(parsed.data.title),
    title: parsed.data.title,
    summary: parsed.data.summary,
    content: parsed.data.content,
    published: parsed.data.published,
    published_at: parsed.data.published ? new Date().toISOString() : null,
    author_id: user.id
  });

  if (error) redirect("/admin?status=error");

  revalidatePath("/");
  revalidatePath("/news");
  redirect("/admin?status=published");
}
