import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;
  const body = await request.json();
  const { playerIds } = body;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { matchPlayers: true },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const existingPlayerIds = match.matchPlayers.map((mp) => mp.playerId);
  const newPlayerIds = (playerIds as string[]).filter(
    (pid) => !existingPlayerIds.includes(pid)
  );

  const totalPlayers = existingPlayerIds.length + newPlayerIds.length;
  const amountPerPlayer = match.totalCost / totalPlayers;

  await prisma.$transaction([
    ...match.matchPlayers.map((mp) =>
      prisma.matchPlayer.update({
        where: { id: mp.id },
        data: { amountOwed: amountPerPlayer },
      })
    ),
    ...newPlayerIds.map((playerId) =>
      prisma.matchPlayer.create({
        data: { matchId, playerId, amountOwed: amountPerPlayer },
      })
    ),
  ]);

  const updated = await prisma.match.findUnique({
    where: { id: matchId },
    include: { matchPlayers: { include: { player: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;
  const { playerId } = await request.json();

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { matchPlayers: true },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  await prisma.matchPlayer.deleteMany({
    where: { matchId, playerId },
  });

  const remaining = match.matchPlayers.filter((mp) => mp.playerId !== playerId);
  if (remaining.length > 0) {
    const amountPerPlayer = match.totalCost / remaining.length;
    await prisma.$transaction(
      remaining.map((mp) =>
        prisma.matchPlayer.update({
          where: { id: mp.id },
          data: { amountOwed: amountPerPlayer },
        })
      )
    );
  }

  const updated = await prisma.match.findUnique({
    where: { id: matchId },
    include: { matchPlayers: { include: { player: true } } },
  });

  return NextResponse.json(updated);
}
