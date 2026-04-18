import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AddParticipantsSchema, RemoveParticipantSchema, parseBody } from "@/lib/schemas";
import { roundCents } from "@/lib/money";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;

  const parsed = parseBody(AddParticipantsSchema, await request.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { playerIds } = parsed.data;

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { matchPlayers: true },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const existingPlayerIds = match.matchPlayers.map((mp) => mp.playerId);
    const newPlayerIds = playerIds.filter((pid) => !existingPlayerIds.includes(pid));

    const totalPlayers = existingPlayerIds.length + newPlayerIds.length;
    if (totalPlayers === 0) {
      return NextResponse.json({ error: "No players to add" }, { status: 400 });
    }

    const amountPerPlayer = roundCents(match.totalCost / totalPlayers);

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
  } catch (e) {
    console.error("[POST /api/matches/:id/participants]", e);
    return NextResponse.json({ error: "Oyuncu eklenemedi" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;

  const parsed = parseBody(RemoveParticipantSchema, await request.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { playerId } = parsed.data;

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { matchPlayers: true },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    await prisma.matchPlayer.deleteMany({ where: { matchId, playerId } });

    const remaining = match.matchPlayers.filter((mp) => mp.playerId !== playerId);
    if (remaining.length > 0) {
      const amountPerPlayer = roundCents(match.totalCost / remaining.length);
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
  } catch (e) {
    console.error("[DELETE /api/matches/:id/participants]", e);
    return NextResponse.json({ error: "Oyuncu çıkarılamadı" }, { status: 500 });
  }
}
