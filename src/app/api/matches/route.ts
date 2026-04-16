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
  const { date, location, totalCost, notes, playerIds } = body;

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

  const amountPerPlayer = totalCost / playerIds.length;

  const match = await prisma.match.create({
    data: {
      date: new Date(date),
      location: location?.trim() || null,
      totalCost: Number(totalCost),
      notes: notes?.trim() || null,
      matchPlayers: {
        create: playerIds.map((playerId: string) => ({
          playerId,
          amountOwed: amountPerPlayer,
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
