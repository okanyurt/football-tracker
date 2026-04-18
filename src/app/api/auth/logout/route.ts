import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, buildCookieOptions } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", buildCookieOptions(0));
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", buildCookieOptions(0));
  return response;
}
