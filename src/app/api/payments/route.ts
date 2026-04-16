import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const { playerId, amount, notes, date, isKasa } = body;

  const parsedAmount = Number(amount);
  const isKasaBool = isKasa === true;

  if (!playerId || !amount || (isKasaBool ? parsedAmount === 0 : parsedAmount <= 0)) {
    return NextResponse.json(
      { error: "Player and a valid amount are required" },
      { status: 400 }
    );
  }

  try {
    const payment = await prisma.payment.create({
      data: {
        playerId,
        amount: parsedAmount,
        notes: notes?.trim() || null,
        date: date ? new Date(date) : new Date(),
        isKasa: isKasaBool,
      },
      include: { player: true },
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (e) {
    console.error("[POST /api/payments] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
