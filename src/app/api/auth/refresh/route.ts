import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyRefreshToken,
  signAccessToken,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_MAX_AGE,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: "Refresh token bulunamadı" }, { status: 401 });
    }

    const payload = await verifyRefreshToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 401 });
    }

    const newAccessToken = await signAccessToken({
      userId: user.id,
      username: user.username,
    });

    const response = NextResponse.json({ success: true, username: user.username });
    response.cookies.set(ACCESS_TOKEN_COOKIE, newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ACCESS_MAX_AGE,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Geçersiz refresh token" }, { status: 401 });
  }
}
