"use server";

import { redirect } from "next/navigation";
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
  const { error } = await supabase.rpc("complete_player_onboarding", {
    new_username: username.data,
    new_display_name: profile.data.displayName
  });

  if (error) {
    if (error.message.includes("USERNAME_TAKEN")) {
      redirect("/account/onboarding?error=username-taken");
    }
    if (error.message.includes("ONBOARDING_ALREADY_COMPLETE")) {
      redirect("/account");
    }
    redirect("/account/onboarding?error=save");
  }

  redirect("/account?status=welcome");
}
