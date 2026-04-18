import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreatePlayerSchema, parseBody } from "@/lib/schemas";

export async function GET() {
  const players = await prisma.player.findMany({
    where: { deletedAt: null },
    include: {
      matchPlayers: { include: { match: true } },
      payments: true,
    },
    orderBy: { name: "asc" },
  });

  const playersWithBalance = players.map((player) => {
    const activeMatches = player.matchPlayers.filter(
      (mp) => !mp.match.cancelledAt && !mp.match.deletedAt
    );
    const totalOwed = activeMatches.reduce((sum, mp) => sum + mp.amountOwed, 0);
    const totalPaid = player.payments
      .filter((p) => !p.cancelledAt && !p.deletedAt)
      .reduce((sum, p) => sum + p.amount, 0);
    return {
      id: player.id,
      name: player.name,
      phone: player.phone,
      createdAt: player.createdAt,
      balance: totalPaid - totalOwed,
      totalOwed,
      totalPaid,
      matchCount: activeMatches.length,
    };
  });

  return NextResponse.json(playersWithBalance);
}

export async function POST(request: Request) {
  const parsed = parseBody(CreatePlayerSchema, await request.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { name, phone } = parsed.data;

  try {
    const player = await prisma.player.create({
      data: { name, phone: phone?.trim() || null },
    });
    return NextResponse.json(player, { status: 201 });
  } catch (e) {
    console.error("[POST /api/players]", e);
    return NextResponse.json({ error: "Oyuncu oluşturulamadı" }, { status: 500 });
  }
}
