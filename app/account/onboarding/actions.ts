"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { profileSchema, usernameSchema } from "@/lib/validation";

export async function completePlayerOnboarding(formData: FormData) {
  await requireUser();

  const username = usernameSchema.safeParse(formData.get("username"));
  const profile = profileSchema.safeParse({
    displayName: formData.get("displayName")
  });

  if (!username.success || !profile.success) {
    redirect("/account/onboarding?error=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { error: usernameError } = await supabase.rpc("change_username", {
    new_username: username.data
  });

  if (usernameError) {
    if (usernameError.message.includes("USERNAME_TAKEN")) {
      redirect("/account/onboarding?error=username-taken");
    }
    redirect("/account/onboarding?error=save");
  }

  const { error: displayError } = await supabase.rpc("update_display_name", {
    new_display_name: profile.data.displayName
  });

  if (displayError) redirect("/account/onboarding?error=save");

  redirect("/account?status=welcome");
}
