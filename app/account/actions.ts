"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { usernameSchema, profileSchema } from "@/lib/validation";

function accountRedirect(code: string): never {
  redirect(`/account?status=${encodeURIComponent(code)}`);
}

export async function updateDisplayName(formData: FormData) {
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName")
  });

  if (!parsed.success) accountRedirect("invalid-profile");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_display_name", {
    new_display_name: parsed.data.displayName
  });

  if (error) accountRedirect("profile-error");
  revalidatePath("/account");
  accountRedirect("profile-updated");
}

export async function changeUsername(formData: FormData) {
  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) accountRedirect("invalid-username");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("change_username", {
    new_username: parsed.data
  });

  if (error) {
    if (error.message.includes("USERNAME_TAKEN")) accountRedirect("username-taken");
    if (error.message.includes("USERNAME_COOLDOWN")) accountRedirect("username-cooldown");
    accountRedirect("username-error");
  }

  revalidatePath("/account");
  accountRedirect("username-updated");
}

export async function requestEmailChange(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) accountRedirect("invalid-email");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ email });

  if (error) accountRedirect("email-error");
  accountRedirect("email-sent");
}

export async function requestPhoneLink(formData: FormData) {
  const phone = String(formData.get("phone") || "").trim();
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) accountRedirect("invalid-phone");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ phone });

  if (error) accountRedirect("phone-unavailable");
  accountRedirect("phone-sent");
}
