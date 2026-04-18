import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, ACCESS_TOKEN_COOKIE } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    return NextResponse.json({ userId: payload.userId, username: payload.username });
  } catch {
    return NextResponse.json({ error: "Geçersiz token" }, { status: 401 });
  }
}
