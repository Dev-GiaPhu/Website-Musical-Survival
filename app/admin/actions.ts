"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { newsSchema } from "@/lib/validation";
import { z } from "zod";

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


const newsIdSchema = z.string().uuid();

export async function updateNews(formData: FormData) {
  await requireAdmin();

  const id = newsIdSchema.safeParse(formData.get("id"));
  const parsed = newsSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    content: formData.get("content"),
    published: formData.get("published") === "on"
  });

  if (!id.success || !parsed.success) redirect("/admin?status=invalid");

  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase
    .from("news_posts")
    .select("published,published_at")
    .eq("id", id.data)
    .maybeSingle();

  if (!current) redirect("/admin?status=error");

  const { error } = await supabase
    .from("news_posts")
    .update({
      title: parsed.data.title,
      summary: parsed.data.summary,
      content: parsed.data.content,
      published: parsed.data.published,
      published_at: parsed.data.published
        ? current.published_at || new Date().toISOString()
        : null
    })
    .eq("id", id.data);

  if (error) redirect(`/admin/news/${id.data}?status=error`);

  revalidatePath("/");
  revalidatePath("/news");
  revalidatePath(`/admin/news/${id.data}`);
  redirect(`/admin/news/${id.data}?status=updated`);
}

export async function toggleNewsVisibility(formData: FormData) {
  await requireAdmin();

  const id = newsIdSchema.safeParse(formData.get("id"));
  const nextPublished = formData.get("published") === "true";
  if (!id.success) redirect("/admin?status=invalid");

  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase
    .from("news_posts")
    .select("published_at")
    .eq("id", id.data)
    .maybeSingle();

  if (!current) redirect("/admin?status=error");

  const { error } = await supabase
    .from("news_posts")
    .update({
      published: nextPublished,
      published_at: nextPublished
        ? current.published_at || new Date().toISOString()
        : null
    })
    .eq("id", id.data);

  if (error) redirect("/admin?status=error");

  revalidatePath("/");
  revalidatePath("/news");
  revalidatePath("/admin");
  redirect("/admin?status=updated");
}

export async function deleteNews(formData: FormData) {
  await requireAdmin();

  const id = newsIdSchema.safeParse(formData.get("id"));
  if (!id.success) redirect("/admin?status=invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("news_posts").delete().eq("id", id.data);

  if (error) redirect(`/admin/news/${id.data}?status=delete-error`);

  revalidatePath("/");
  revalidatePath("/news");
  revalidatePath("/admin");
  redirect("/admin?status=deleted");
}
