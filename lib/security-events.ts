import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SecuritySeverity = "info" | "warning" | "critical";

export async function recordSecurityEvent({
  userId = null,
  eventType,
  severity = "info",
  details = {}
}: {
  userId?: string | null;
  eventType: string;
  severity?: SecuritySeverity;
  details?: Record<string, unknown>;
}) {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("security_events").insert({
      user_id: userId,
      event_type: eventType,
      severity,
      details
    });
  } catch {
    // Security telemetry must never break the primary account/payment flow.
  }
}
