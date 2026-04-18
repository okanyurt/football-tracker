import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

function requireEnv(key: string): Uint8Array {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return new TextEncoder().encode(val);
}

export const ACCESS_TOKEN_COOKIE = "ft_access";
export const REFRESH_TOKEN_COOKIE = "ft_refresh";
export const ACCESS_MAX_AGE = 15 * 60;        // 15 min in seconds
export const REFRESH_MAX_AGE = 4 * 60 * 60;   // 4 hours in seconds

export type AccessPayload = { userId: string; username: string };
export type RefreshPayload = { userId: string };

const AccessPayloadSchema = z.object({
  userId: z.string().min(1),
  username: z.string().min(1),
});

const RefreshPayloadSchema = z.object({
  userId: z.string().min(1),
});

export async function signAccessToken(payload: AccessPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_MAX_AGE}s`)
    .sign(requireEnv("JWT_ACCESS_SECRET"));
}

export async function signRefreshToken(payload: RefreshPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_MAX_AGE}s`)
    .sign(requireEnv("JWT_REFRESH_SECRET"));
}

export async function verifyAccessToken(token: string): Promise<AccessPayload> {
  const { payload } = await jwtVerify(token, requireEnv("JWT_ACCESS_SECRET"));
  return AccessPayloadSchema.parse(payload);
}

export async function verifyRefreshToken(token: string): Promise<RefreshPayload> {
  const { payload } = await jwtVerify(token, requireEnv("JWT_REFRESH_SECRET"));
  return RefreshPayloadSchema.parse(payload);
}

export function buildCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}
