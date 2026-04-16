import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { team1Name, team2Name, playerTeams } = await request.json();

  const match = await prisma.match.findUnique({ where: { id }, include: { matchPlayers: true } });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.match.update({
      where: { id },
      data: {
        team1Name: team1Name?.trim() || null,
        team2Name: team2Name?.trim() || null,
      },
    }),
    ...match.matchPlayers.map((mp) =>
      prisma.matchPlayer.update({
        where: { id: mp.id },
        data: { team: playerTeams?.[mp.playerId] ?? null },
      })
    ),
  ]);

  const updated = await prisma.match.findUnique({
    where: { id },
    include: { matchPlayers: { include: { player: true } } },
  });

  return NextResponse.json(updated);
}
