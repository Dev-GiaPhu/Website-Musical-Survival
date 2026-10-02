import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      service: "musical-survival",
      status: "ok",
      timestamp: new Date().toISOString()
    },
    {
      headers: {
        "cache-control": "no-store"
      }
    }
  );
}
