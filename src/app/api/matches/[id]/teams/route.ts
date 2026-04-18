import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateTeamsSchema, parseBody } from "@/lib/schemas";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const parsed = parseBody(UpdateTeamsSchema, await request.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { team1Name, team2Name, playerTeams } = parsed.data;

  try {
    const match = await prisma.match.findUnique({
      where: { id },
      include: { matchPlayers: true },
    });
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
  } catch (e) {
    console.error("[PATCH /api/matches/:id/teams]", e);
    return NextResponse.json({ error: "Takımlar güncellenemedi" }, { status: 500 });
  }
}
