import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  signAccessToken,
  signRefreshToken,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  buildCookieOptions,
} from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { LoginSchema, parseBody } from "@/lib/schemas";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Pre-computed bcrypt hash used when the username doesn't exist.
// Ensures bcrypt always runs → prevents timing-based username enumeration.
const DUMMY_HASH = "$2b$12$dummyhashfortimingprotection000000000000000000000000u";

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Next.js dev: normalise IPv6 loopback → consistent key
  const ip = (req as unknown as { ip?: string }).ip ?? "127.0.0.1";
  return ip === "::1" ? "127.0.0.1" : ip;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // IP-level rate limit
    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Çok fazla başarısız deneme. Lütfen bekleyin." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Reset": String(rate.resetAt),
          },
        }
      );
    }

    // Input validation
    const parsed = parseBody(LoginSchema, await req.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { username, password } = parsed.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    // Account lockout check
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const seconds = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Hesap kilitlendi. ${Math.ceil(seconds / 60)} dakika sonra tekrar deneyin.` },
        { status: 423 }
      );
    }

    // Always run bcrypt regardless of whether the user exists.
    // This prevents timing attacks that reveal valid usernames via response time differences.
    const passwordValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

    if (!user || !passwordValid) {
      // Increment failed attempts in DB
      if (user) {
        const newCount = user.failedLoginAttempts + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newCount,
            lockedUntil: newCount >= MAX_FAILED_ATTEMPTS
              ? new Date(Date.now() + LOCKOUT_DURATION_MS)
              : null,
          },
        });
      }

      return NextResponse.json(
        { error: "Kullanıcı adı veya şifre hatalı" },
        { status: 401 }
      );
    }

    // Success — reset counters
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    resetRateLimit(ip);

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ userId: user.id, username: user.username }),
      signRefreshToken({ userId: user.id }),
    ]);

    const response = NextResponse.json({ success: true, username: user.username });
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, buildCookieOptions(ACCESS_MAX_AGE));
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, buildCookieOptions(REFRESH_MAX_AGE));

    return response;
  } catch (e) {
    console.error("[POST /api/auth/login]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
