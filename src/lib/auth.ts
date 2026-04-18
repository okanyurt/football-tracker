import { SignJWT, jwtVerify } from "jose";

const getSecret = (key: string, fallback: string) =>
  new TextEncoder().encode(process.env[key] ?? fallback);

const accessSecret = () =>
  getSecret("JWT_ACCESS_SECRET", "fallback-access-secret-change-in-production");
const refreshSecret = () =>
  getSecret("JWT_REFRESH_SECRET", "fallback-refresh-secret-change-in-production");

export const ACCESS_TOKEN_COOKIE = "ft_access";
export const REFRESH_TOKEN_COOKIE = "ft_refresh";
export const ACCESS_MAX_AGE = 15 * 60; // 15 min in seconds
export const REFRESH_MAX_AGE = 4 * 60 * 60; // 4 hours in seconds

export type AccessPayload = {
  userId: string;
  username: string;
};

export type RefreshPayload = {
  userId: string;
};

export async function signAccessToken(payload: AccessPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_MAX_AGE}s`)
    .sign(accessSecret());
}

export async function signRefreshToken(payload: RefreshPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_MAX_AGE}s`)
    .sign(refreshSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessPayload> {
  const { payload } = await jwtVerify(token, accessSecret());
  return payload as unknown as AccessPayload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshPayload> {
  const { payload } = await jwtVerify(token, refreshSecret());
  return payload as unknown as RefreshPayload;
}
