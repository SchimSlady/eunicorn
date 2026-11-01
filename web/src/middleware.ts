import { NextResponse, type NextRequest } from "next/server";

/**
 * /admin sits behind the browser's own password prompt (HTTP Basic auth). Any user name, the
 * password is ADMIN_PASSWORD (a Vercel env var). Without that variable the page doesn't exist.
 */
export function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return new NextResponse(null, { status: 404 });

  const given = decodeBasicPassword(req.headers.get("authorization"));
  if (given !== null && sameText(given, password)) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  return new NextResponse("Password required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="EUnicorn admin", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}

function decodeBasicPassword(header: string | null): string | null {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0)));
    const colon = decoded.indexOf(":");
    return colon === -1 ? null : decoded.slice(colon + 1);
  } catch {
    return null;
  }
}

/** Compares in time independent of where the strings differ, so the password can't be guessed bit by bit. */
function sameText(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
