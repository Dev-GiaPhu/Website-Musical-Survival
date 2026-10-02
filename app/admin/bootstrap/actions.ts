"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function bootstrapSuperAdmin() {
  const user = await requireUser();
  const expectedEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();

  if (!expectedEmail || !user.email || user.email.toLowerCase() !== expectedEmail) {
    redirect("/account");
  }

  const admin = createSupabaseAdminClient();
  const { data: existingSuperAdmin } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "super_admin")
    .limit(1)
    .maybeSingle();

  if (existingSuperAdmin && existingSuperAdmin.id !== user.id) {
    redirect("/account?status=bootstrap-closed");
  }

  const { error } = await admin
    .from("profiles")
    .update({ role: "super_admin" })
    .eq("id", user.id);

  if (error) redirect("/account?status=bootstrap-error");

  await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    target_user_id: user.id,
    action: "admin.super_admin_bootstrapped",
    entity_type: "profile",
    entity_id: user.id,
    details: { source: "one_time_bootstrap" }
  });

  redirect("/admin");
}
