import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const matches = await prisma.match.findMany({
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
  const body = await request.json();
  const { date, location, totalCost, notes, playerIds, goalkeeperFree, goalkeeperPlayerIds, perPlayerAmount } = body;

  if (!date || !totalCost) {
    return NextResponse.json(
      { error: "Date and total cost are required" },
      { status: 400 }
    );
  }

  if (!playerIds || playerIds.length === 0) {
    return NextResponse.json(
      { error: "At least one player must be selected" },
      { status: 400 }
    );
  }

  const freeIds: string[] = goalkeeperFree && goalkeeperPlayerIds?.length ? goalkeeperPlayerIds : [];
  const payingCount = playerIds.filter((id: string) => !freeIds.includes(id)).length;
  const amountPerPlayer = perPlayerAmount != null
    ? Number(perPlayerAmount)
    : payingCount > 0 ? Number(totalCost) / payingCount : 0;

  const match = await prisma.match.create({
    data: {
      date: new Date(date),
      location: location?.trim() || null,
      totalCost: Number(totalCost),
      notes: notes?.trim() || null,
      goalkeeperFree: !!goalkeeperFree,
      matchPlayers: {
        create: playerIds.map((playerId: string) => ({
          playerId,
          isGoalkeeper: freeIds.includes(playerId),
          amountOwed: freeIds.includes(playerId) ? 0 : amountPerPlayer,
        })),
      },
    },
    include: {
      matchPlayers: {
        include: { player: true },
      },
    },
  });

  return NextResponse.json(match, { status: 201 });
}
