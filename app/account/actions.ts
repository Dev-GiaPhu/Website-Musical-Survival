"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { usernameSchema, profileSchema } from "@/lib/validation";
import { getRequestOrigin } from "@/lib/site-url";
import { recordSecurityEvent } from "@/lib/security-events";

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
  const { data: currentUser } = await supabase.auth.getUser();

  if (!currentUser.user) accountRedirect("email-error");
  if (currentUser.user.email?.toLowerCase() === email) {
    accountRedirect("email-same");
  }

  const origin = await getRequestOrigin();
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: origin }
  );

  if (error) accountRedirect("email-error");

  await recordSecurityEvent({
    userId: currentUser.user.id,
    eventType: "account.email_change_requested",
    severity: "info",
    details: { newEmail: email }
  });

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

export async function verifyPhoneLink(formData: FormData) {
  const phone = String(formData.get("phone") || "").trim();
  const token = String(formData.get("token") || "").trim();

  if (!/^\+[1-9]\d{7,14}$/.test(phone)) accountRedirect("invalid-phone");
  if (!/^\d{6}$/.test(token)) accountRedirect("invalid-phone-code");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "phone_change"
  });

  if (error) accountRedirect("phone-code-error");

  const { data: verifiedUser } = await supabase.auth.getUser();
  await recordSecurityEvent({
    userId: verifiedUser.user?.id || null,
    eventType: "account.phone_verified",
    severity: "info"
  });

  revalidatePath("/account");
  accountRedirect("phone-verified");
}


export async function unlinkGoogleIdentity(formData: FormData) {
  const identityId = String(formData.get("identityId") || "").trim();
  if (!identityId) accountRedirect("google-unlink-error");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUserIdentities();

  if (error) accountRedirect("google-unlink-error");

  const identities = data.identities ?? [];
  if (identities.length <= 1) accountRedirect("google-unlink-last");

  const target = identities.find(
    (identity) => identity.id === identityId && identity.provider === "google"
  );

  if (!target) accountRedirect("google-unlink-error");

  const { error: unlinkError } = await supabase.auth.unlinkIdentity(target);
  if (unlinkError) accountRedirect("google-unlink-error");

  const { data: identityUser } = await supabase.auth.getUser();
  await recordSecurityEvent({
    userId: identityUser.user?.id || null,
    eventType: "account.google_identity_unlinked",
    severity: "warning",
    details: { identityId }
  });

  revalidatePath("/account");
  accountRedirect("google-unlinked");
}


export async function deleteOwnAccount(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;

  if (authError || !user) {
    redirect("/auth?mode=login");
  }

  const username = String(formData.get("username") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const confirmation = formData.get("confirmation") === "on";

  if (!confirmation || !username || !email) {
    accountRedirect("delete-invalid");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile?.username ||
    profile.username.toLowerCase() !== username.toLowerCase() ||
    !user.email ||
    user.email.toLowerCase() !== email
  ) {
    accountRedirect("delete-mismatch");
  }

  const admin = createSupabaseAdminClient();

  await recordSecurityEvent({
    userId: user.id,
    eventType: "account.self_delete_requested",
    severity: "critical"
  });

  await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    target_user_id: user.id,
    action: "account.self_delete_requested",
    entity_type: "profile",
    entity_id: user.id,
    details: {
      username: profile.username
    }
  });

  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    accountRedirect("delete-error");
  }

  await supabase.auth.signOut({ scope: "global" });
  redirect("/auth?status=account-deleted");
}
