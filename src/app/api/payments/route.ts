import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreatePaymentSchema, parseBody } from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = parseBody(CreatePaymentSchema, await request.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { playerId, amount, notes, date, isKasa } = parsed.data;
  const isKasaBool = isKasa === true;

  if (!isKasaBool && amount <= 0) {
    return NextResponse.json(
      { error: "Geçerli bir tutar giriniz" },
      { status: 400 }
    );
  }

  if (isKasaBool && amount === 0) {
    return NextResponse.json(
      { error: "Kasa tutarı sıfır olamaz" },
      { status: 400 }
    );
  }

  try {
    const payment = await prisma.payment.create({
      data: {
        playerId,
        amount,
        notes: notes?.trim() || null,
        date: date ? new Date(date) : new Date(),
        isKasa: isKasaBool,
      },
      include: { player: true },
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (e) {
    console.error("[POST /api/payments]", e);
    return NextResponse.json({ error: "Ödeme oluşturulamadı" }, { status: 500 });
  }
}
