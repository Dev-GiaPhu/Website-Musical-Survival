import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createMomoRequestSignature, getMomoConfig } from "@/lib/momo";
import { topupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");

  if (!origin || origin !== requestUrl.origin) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.redirect(new URL("/auth", request.url), 303);

  const formData = await request.formData();
  const parsed = topupSchema.safeParse({ packageId: formData.get("packageId") });
  if (!parsed.success) return NextResponse.redirect(new URL("/top-up?error=package", request.url), 303);

  const config = getMomoConfig();
  if (!config) return NextResponse.redirect(new URL("/top-up?error=unavailable", request.url), 303);

  const admin = createSupabaseAdminClient();
  const { data: topupPackage } = await admin
    .from("topup_packages")
    .select("id,name,vnd_amount,coin_amount,active")
    .eq("id", parsed.data.packageId)
    .eq("active", true)
    .single();

  if (!topupPackage) return NextResponse.redirect(new URL("/top-up?error=package", request.url), 303);

  const orderId = `MS-${randomUUID()}`;
  const requestId = randomUUID();
  const extraData = "";
  const requestType = "captureWallet";
  const orderInfo = `Musical Survival - ${topupPackage.name}`;
  const amount = Number(topupPackage.vnd_amount);

  const { error: orderError } = await admin.from("payment_orders").insert({
    user_id: authData.user.id,
    package_id: topupPackage.id,
    provider: "momo",
    provider_order_id: orderId,
    provider_request_id: requestId,
    amount_vnd: amount,
    coin_amount: topupPackage.coin_amount,
    status: "pending",
    idempotency_key: randomUUID()
  });

  if (orderError) return NextResponse.redirect(new URL("/top-up?error=order", request.url), 303);

  const signature = createMomoRequestSignature({
    accessKey: config.accessKey,
    amount,
    extraData,
    ipnUrl: config.ipnUrl,
    orderId,
    orderInfo,
    partnerCode: config.partnerCode,
    redirectUrl: config.redirectUrl,
    requestId,
    requestType,
    secretKey: config.secretKey
  });

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      partnerCode: config.partnerCode,
      partnerName: "Musical Survival",
      storeId: "MusicalSurvival",
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: config.redirectUrl,
      ipnUrl: config.ipnUrl,
      lang: "vi",
      requestType,
      autoCapture: true,
      extraData,
      signature
    }),
    cache: "no-store"
  });

  const payload = await response.json().catch(() => null) as { payUrl?: string; resultCode?: number } | null;

  if (!response.ok || !payload?.payUrl || payload.resultCode !== 0) {
    await admin.from("payment_orders").update({ status: "failed" }).eq("provider_order_id", orderId);
    return NextResponse.redirect(new URL("/top-up?error=payment", request.url), 303);
  }

  return NextResponse.redirect(payload.payUrl, 303);
}
