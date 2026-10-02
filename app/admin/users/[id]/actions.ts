"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const statusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "suspended", "banned"]),
  reason: z.string().trim().min(3).max(500)
});

const walletSchema = z.object({
  userId: z.string().uuid(),
  delta: z.coerce.number().int().min(-1000000000).max(1000000000).refine((v) => v !== 0),
  reason: z.string().trim().min(3).max(500)
});

function back(userId: string, status: string): never {
  redirect(`/admin/users/${encodeURIComponent(userId)}?status=${encodeURIComponent(status)}`);
}

export async function setPlayerStatus(formData: FormData) {
  await requireAdmin();

  const parsed = statusSchema.safeParse({
    userId: formData.get("userId"),
    status: formData.get("status"),
    reason: formData.get("reason")
  });

  if (!parsed.success) {
    const userId = String(formData.get("userId") || "");
    back(userId, "invalid-status");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_player_status", {
    target_user_id: parsed.data.userId,
    new_status: parsed.data.status,
    reason: parsed.data.reason
  });

  if (error) back(parsed.data.userId, "status-error");

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${parsed.data.userId}`);
  back(parsed.data.userId, "status-updated");
}

export async function adjustWallet(formData: FormData) {
  await requireAdmin();

  const parsed = walletSchema.safeParse({
    userId: formData.get("userId"),
    delta: formData.get("delta"),
    reason: formData.get("reason")
  });

  if (!parsed.success) {
    const userId = String(formData.get("userId") || "");
    back(userId, "invalid-wallet");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_adjust_wallet", {
    target_user_id: parsed.data.userId,
    delta_amount: parsed.data.delta,
    reason: parsed.data.reason
  });

  if (error) {
    if (error.message.includes("INSUFFICIENT_BALANCE")) {
      back(parsed.data.userId, "wallet-negative");
    }
    if (error.message.includes("FORBIDDEN")) {
      back(parsed.data.userId, "wallet-forbidden");
    }
    back(parsed.data.userId, "wallet-error");
  }

  revalidatePath(`/admin/users/${parsed.data.userId}`);
  back(parsed.data.userId, "wallet-updated");
}
