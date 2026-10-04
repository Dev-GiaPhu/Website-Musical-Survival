import { NextResponse } from "next/server";

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://musical-survival-official.robloxphu113.workers.dev"
  );
}

export async function GET() {
  const baseUrl = siteUrl();
  const paymentsEnabled = Boolean(
    process.env.MOMO_PARTNER_CODE &&
    process.env.MOMO_ACCESS_KEY &&
    process.env.MOMO_SECRET_KEY &&
    process.env.MOMO_ENDPOINT &&
    process.env.MOMO_IPN_URL &&
    process.env.MOMO_REDIRECT_URL
  );

  return NextResponse.json(
    {
      service: "musical-survival",
      accountUrl: `${baseUrl}/account`,
      registerUrl: `${baseUrl}/auth?mode=register`,
      newsUrl: `${baseUrl}/news`,
      eventsUrl: `${baseUrl}/events`,
      topUpUrl: `${baseUrl}/top-up`,
      features: {
        emailRegistration: true,
        googleSignIn: true,
        phoneVerification:
          process.env.NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED === "true",
        payments: paymentsEnabled
      }
    },
    {
      headers: {
        "cache-control": "public, max-age=60, s-maxage=300"
      }
    }
  );
}
