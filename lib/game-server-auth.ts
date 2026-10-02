import { timingSafeEqual } from "node:crypto";

export function isTrustedGameServer(request: Request) {
  const expected = process.env.GAME_SERVER_API_KEY;
  if (!expected || expected.length < 32) return false;

  const authorization = request.headers.get("authorization") || "";
  const received = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!received || received.length !== expected.length) return false;

  return timingSafeEqual(
    Buffer.from(received, "utf8"),
    Buffer.from(expected, "utf8")
  );
}
