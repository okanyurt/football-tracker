import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateMatchSchema, parseBody } from "@/lib/schemas";
import { roundCents } from "@/lib/money";

export async function GET() {
  const matches = await prisma.match.findMany({
    where: { deletedAt: null },
    include: {
      matchPlayers: {
        include: { player: true },
      },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(matches);
}

export async function POST(request: Request) {
  const parsed = parseBody(CreateMatchSchema, await request.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const {
    date,
    location,
    totalCost,
    notes,
    playerIds,
    goalkeeperFree,
    goalkeeperPlayerIds,
    perPlayerAmount,
    team1Name,
    team2Name,
    playerTeams,
  } = parsed.data;

  const freeIds: string[] = goalkeeperFree && goalkeeperPlayerIds?.length
    ? goalkeeperPlayerIds
    : [];
  const payingCount = playerIds.filter((id) => !freeIds.includes(id)).length;
  const amountPerPlayer =
    perPlayerAmount != null
      ? perPlayerAmount
      : payingCount > 0
      ? roundCents(totalCost / payingCount)
      : 0;

  try {
    const match = await prisma.match.create({
      data: {
        date: new Date(date),
        location: location?.trim() || null,
        totalCost,
        notes: notes?.trim() || null,
        goalkeeperFree: !!goalkeeperFree,
        team1Name: team1Name?.trim() || null,
        team2Name: team2Name?.trim() || null,
        matchPlayers: {
          create: playerIds.map((playerId) => ({
            playerId,
            isGoalkeeper: freeIds.includes(playerId),
            amountOwed: freeIds.includes(playerId) ? 0 : amountPerPlayer,
            team: playerTeams?.[playerId] ?? null,
          })),
        },
      },
      include: { matchPlayers: { include: { player: true } } },
    });
    return NextResponse.json(match, { status: 201 });
  } catch (e) {
    console.error("[POST /api/matches]", e);
    return NextResponse.json({ error: "Maç oluşturulamadı" }, { status: 500 });
  }
}
