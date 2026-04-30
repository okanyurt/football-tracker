import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const recentMatches = await prisma.match.findMany({
    where: { deletedAt: null, cancelledAt: null },
    orderBy: { date: "desc" },
    take: 4,
    select: { id: true },
  });

  if (recentMatches.length < 4) {
    return NextResponse.json({ players: [], matchesChecked: recentMatches.length });
  }

  const recentMatchIds = recentMatches.map((m) => m.id);

  const players = await prisma.player.findMany({
    where: { deletedAt: null, isExempt: false },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          matchPlayers: {
            where: { match: { deletedAt: null, cancelledAt: null } },
          },
        },
      },
      matchPlayers: {
        where: { matchId: { in: recentMatchIds } },
        select: { matchId: true },
      },
    },
  });

  const atRisk = players
    .filter((p) => p._count.matchPlayers > 0 && p.matchPlayers.length === 0)
    .map((p) => ({ id: p.id, name: p.name }));

  return NextResponse.json({ players: atRisk, matchesChecked: 4 });
}
