"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/lib/site-url";
import { usernameSchema } from "@/lib/validation";

const emailSchema = z.string().trim().toLowerCase().email().max(254);

const strongPasswordSchema = z
  .string()
  .min(8)
  .max(72)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/);

const signUpSchema = z
  .object({
    email: emailSchema,
    username: usernameSchema,
    displayName: z.string().trim().min(1).max(32),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
    terms: z.literal("on")
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"]
  });

function authRedirect(params: Record<string, string>): never {
  const search = new URLSearchParams(params);
  redirect(`/auth?${search.toString()}`);
}

export async function signUpWithEmail(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    terms: formData.get("terms")
  });

  if (!parsed.success) {
    authRedirect({ mode: "register", error: "invalid-registration" });
  }

  const admin = createSupabaseAdminClient();
  const { data: usernameOwner } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", parsed.data.username)
    .maybeSingle();

  if (usernameOwner) {
    authRedirect({ mode: "register", error: "username-taken" });
  }

  const origin = await getRequestOrigin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: origin,
      data: {
        username: parsed.data.username,
        display_name: parsed.data.displayName
      }
    }
  });

  if (error) {
    authRedirect({ mode: "register", error: "registration-failed" });
  }

  if (data.session) {
    redirect("/account?status=welcome");
  }

  authRedirect({
    mode: "verify",
    status: "verification-sent",
    email: parsed.data.email
  });
}

export async function signInWithEmail(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = String(formData.get("password") || "");

  if (!email.success || !password) {
    authRedirect({ mode: "login", error: "invalid-login" });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.data,
    password
  });

  if (error) {
    const normalized = error.message.toLowerCase();

    if (
      normalized.includes("email not confirmed") ||
      normalized.includes("email_not_confirmed")
    ) {
      authRedirect({
        mode: "verify",
        error: "email-not-confirmed",
        email: email.data
      });
    }

    authRedirect({ mode: "login", error: "invalid-credentials" });
  }

  redirect("/account");
}

export async function resendVerificationEmail(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));

  if (!email.success) {
    authRedirect({ mode: "verify", error: "invalid-email" });
  }

  const origin = await getRequestOrigin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.data,
    options: {
      emailRedirectTo: origin
    }
  });

  if (error) {
    authRedirect({
      mode: "verify",
      error: "resend-failed",
      email: email.data
    });
  }

  authRedirect({
    mode: "verify",
    status: "verification-resent",
    email: email.data
  });
}

export async function requestPasswordReset(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));

  if (!email.success) {
    authRedirect({ mode: "forgot", error: "invalid-email" });
  }

  const origin = await getRequestOrigin();
  const supabase = await createSupabaseServerClient();

  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: origin
  });

  authRedirect({
    mode: "forgot",
    status: "reset-sent"
  });
}
