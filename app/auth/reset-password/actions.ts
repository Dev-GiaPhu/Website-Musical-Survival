"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/);

export async function updateRecoveredPassword(formData: FormData) {
  const password = passwordSchema.safeParse(formData.get("password"));
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!password.success || password.data !== confirmPassword) {
    redirect("/auth/reset-password?error=invalid-password");
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/auth?mode=forgot&error=recovery-session-expired");
  }

  const { error } = await supabase.auth.updateUser({
    password: password.data
  });

  if (error) {
    redirect("/auth/reset-password?error=update-failed");
  }

  redirect("/account?status=password-updated");
}
