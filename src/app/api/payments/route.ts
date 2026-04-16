import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const { playerId, amount, notes, date } = body;

  if (!playerId || !amount || Number(amount) <= 0) {
    return NextResponse.json(
      { error: "Player and a valid amount are required" },
      { status: 400 }
    );
  }

  const payment = await prisma.payment.create({
    data: {
      playerId,
      amount: Number(amount),
      notes: notes?.trim() || null,
      date: date ? new Date(date) : new Date(),
    },
    include: { player: true },
  });

  return NextResponse.json(payment, { status: 201 });
}
