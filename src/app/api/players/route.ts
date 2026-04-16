import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const players = await prisma.player.findMany({
    include: {
      matchPlayers: { include: { match: true } },
      payments: true,
    },
    orderBy: { name: "asc" },
  });

  const playersWithBalance = players.map((player) => {
    const activeMatches = player.matchPlayers.filter((mp) => !mp.match.cancelledAt);
    const totalOwed = activeMatches.reduce((sum, mp) => sum + mp.amountOwed, 0);
    const totalPaid = player.payments
      .filter((p) => !p.cancelledAt)
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
  const body = await request.json();
  const { name, phone } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const player = await prisma.player.create({
    data: { name: name.trim(), phone: phone?.trim() || null },
  });

  return NextResponse.json(player, { status: 201 });
}
