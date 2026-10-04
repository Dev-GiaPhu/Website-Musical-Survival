import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMomoConfig, verifyMomoCallback } from "@/lib/momo";
import { recordSecurityEvent } from "@/lib/security-events";

export async function POST(request: Request) {
  const config = getMomoConfig();
  if (!config) return NextResponse.json({ resultCode: 99, message: "Unavailable" }, { status: 503 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !verifyMomoCallback(body, config)) {
    await recordSecurityEvent({
      eventType: "payment.momo_invalid_signature",
      severity: "critical",
      details: {
        orderId: body ? String(body.orderId ?? "") : null,
        partnerCode: body ? String(body.partnerCode ?? "") : null
      }
    });
    return NextResponse.json({ resultCode: 97, message: "Invalid signature" }, { status: 401 });
  }

  if (String(body.partnerCode ?? "") !== config.partnerCode) {
    await recordSecurityEvent({
      eventType: "payment.momo_invalid_partner",
      severity: "critical",
      details: { orderId: String(body.orderId ?? "") }
    });
    return NextResponse.json({ resultCode: 97, message: "Invalid partner" }, { status: 400 });
  }

  const orderId = String(body.orderId ?? "");
  const amount = Number(body.amount);
  const resultCode = Number(body.resultCode);
  const transId = String(body.transId ?? "");

  const admin = createSupabaseAdminClient();
  const { data: order } = await admin
    .from("payment_orders")
    .select("id,amount_vnd,status")
    .eq("provider_order_id", orderId)
    .single();

  if (!order || Number(order.amount_vnd) !== amount) {
    return NextResponse.json({ resultCode: 97, message: "Invalid order" }, { status: 400 });
  }

  await admin.from("payment_webhook_events").insert({
    provider: "momo",
    provider_order_id: orderId,
    provider_transaction_id: transId || null,
    valid_signature: true,
    payload: body
  });

  if (resultCode === 0) {
    const { error } = await admin.rpc("finalize_payment_order", {
      target_order_id: order.id,
      provider_transaction_id: transId
    });

    if (error) {
      return NextResponse.json({ resultCode: 99, message: "Processing error" }, { status: 500 });
    }
  } else if (order.status === "pending") {
    await admin.from("payment_orders").update({ status: "failed" }).eq("id", order.id);
  }

  return NextResponse.json({ resultCode: 0, message: "OK" });
}
