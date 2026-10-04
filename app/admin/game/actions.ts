"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const codeSchema = z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9_-]+$/);

const packageSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(80),
  vndAmount: z.coerce.number().int().positive().max(2000000000),
  coinAmount: z.coerce.number().int().positive().max(1000000000),
  active: z.boolean()
});

const itemSchema = z.object({
  sku: codeSchema,
  name: z.string().trim().min(2).max(100),
  priceCoins: z.coerce.number().int().nonnegative().max(1000000000),
  active: z.boolean()
});

const achievementSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(2).max(500),
  hidden: z.boolean(),
  active: z.boolean()
});

const idSchema = z.string().uuid();

function back(status: string): never {
  redirect(`/admin/game?status=${encodeURIComponent(status)}`);
}

export async function createTopupPackage(formData: FormData) {
  await requireAdmin();
  const parsed = packageSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    vndAmount: formData.get("vndAmount"),
    coinAmount: formData.get("coinAmount"),
    active: formData.get("active") === "on"
  });

  if (!parsed.success) back("package-invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("topup_packages").insert({
    code: parsed.data.code,
    name: parsed.data.name,
    vnd_amount: parsed.data.vndAmount,
    coin_amount: parsed.data.coinAmount,
    active: parsed.data.active
  });

  if (error) back("package-error");
  revalidatePath("/admin/game");
  revalidatePath("/top-up");
  back("package-created");
}

export async function createStoreItem(formData: FormData) {
  await requireAdmin();
  const parsed = itemSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    priceCoins: formData.get("priceCoins"),
    active: formData.get("active") === "on"
  });

  if (!parsed.success) back("item-invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("store_items").insert({
    sku: parsed.data.sku,
    name: parsed.data.name,
    price_coins: parsed.data.priceCoins,
    active: parsed.data.active
  });

  if (error) back("item-error");
  revalidatePath("/admin/game");
  back("item-created");
}

export async function createAchievement(formData: FormData) {
  await requireAdmin();
  const parsed = achievementSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
    hidden: formData.get("hidden") === "on",
    active: formData.get("active") === "on"
  });

  if (!parsed.success) back("achievement-invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("achievements").insert({
    code: parsed.data.code,
    name: parsed.data.name,
    description: parsed.data.description,
    hidden: parsed.data.hidden,
    active: parsed.data.active
  });

  if (error) back("achievement-error");
  revalidatePath("/admin/game");
  back("achievement-created");
}


export async function updateTopupPackage(formData: FormData) {
  await requireAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  const parsed = packageSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    vndAmount: formData.get("vndAmount"),
    coinAmount: formData.get("coinAmount"),
    active: formData.get("active") === "on"
  });

  if (!id.success || !parsed.success) back("package-invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("topup_packages")
    .update({
      code: parsed.data.code,
      name: parsed.data.name,
      vnd_amount: parsed.data.vndAmount,
      coin_amount: parsed.data.coinAmount,
      active: parsed.data.active
    })
    .eq("id", id.data);

  if (error) redirect(`/admin/game/package/${id.data}?status=error`);

  revalidatePath("/admin/game");
  revalidatePath("/top-up");
  redirect(`/admin/game/package/${id.data}?status=updated`);
}

export async function deleteTopupPackage(formData: FormData) {
  await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) back("package-invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("topup_packages").delete().eq("id", id.data);

  if (error) redirect(`/admin/game/package/${id.data}?status=delete-error`);

  revalidatePath("/admin/game");
  revalidatePath("/top-up");
  redirect("/admin/game?status=package-deleted");
}

export async function updateStoreItem(formData: FormData) {
  await requireAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  const parsed = itemSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    priceCoins: formData.get("priceCoins"),
    active: formData.get("active") === "on"
  });

  if (!id.success || !parsed.success) back("item-invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("store_items")
    .update({
      sku: parsed.data.sku,
      name: parsed.data.name,
      price_coins: parsed.data.priceCoins,
      active: parsed.data.active
    })
    .eq("id", id.data);

  if (error) redirect(`/admin/game/item/${id.data}?status=error`);

  revalidatePath("/admin/game");
  redirect(`/admin/game/item/${id.data}?status=updated`);
}

export async function deleteStoreItem(formData: FormData) {
  await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) back("item-invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("store_items").delete().eq("id", id.data);

  if (error) redirect(`/admin/game/item/${id.data}?status=delete-error`);

  revalidatePath("/admin/game");
  redirect("/admin/game?status=item-deleted");
}

export async function updateAchievement(formData: FormData) {
  await requireAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  const parsed = achievementSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
    hidden: formData.get("hidden") === "on",
    active: formData.get("active") === "on"
  });

  if (!id.success || !parsed.success) back("achievement-invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("achievements")
    .update({
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description,
      hidden: parsed.data.hidden,
      active: parsed.data.active
    })
    .eq("id", id.data);

  if (error) redirect(`/admin/game/achievement/${id.data}?status=error`);

  revalidatePath("/admin/game");
  redirect(`/admin/game/achievement/${id.data}?status=updated`);
}

export async function deleteAchievement(formData: FormData) {
  await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) back("achievement-invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("achievements").delete().eq("id", id.data);

  if (error) redirect(`/admin/game/achievement/${id.data}?status=delete-error`);

  revalidatePath("/admin/game");
  redirect("/admin/game?status=achievement-deleted");
}
