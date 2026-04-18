import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_TOKEN_COOKIE = "ft_access";
const PUBLIC_PATHS = ["/login"];
const PUBLIC_API_PREFIXES = ["/api/auth/login", "/api/auth/refresh", "/api/auth/logout"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function getAccessSecret(): Uint8Array {
  const val = process.env.JWT_ACCESS_SECRET;
  if (!val) throw new Error("JWT_ACCESS_SECRET environment variable is required");
  return new TextEncoder().encode(val);
}

function addSecurityHeaders(res: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function csrfCheck(req: NextRequest): boolean {
  if (!MUTATING_METHODS.has(req.method)) return true;

  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin requests often omit Origin

  const host = req.headers.get("host") ?? "";
  return origin === `http://${host}` || origin === `https://${host}`;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets — skip
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/")
  ) {
    return NextResponse.next();
  }

  // Public auth API — skip (but still add security headers)
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Login page — skip token check
  if (PUBLIC_PATHS.includes(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // CSRF check for state-changing requests
  if (!csrfCheck(req)) {
    return addSecurityHeaders(
      NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
    );
  }

  // Token validation
  const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
      );
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await jwtVerify(token, getAccessSecret());
    return addSecurityHeaders(NextResponse.next());
  } catch {
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Token geçersiz veya süresi dolmuş" }, { status: 401 })
      );
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
