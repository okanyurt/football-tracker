import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdatePlayerSchema, parseBody } from "@/lib/schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      matchPlayers: {
        include: { match: true },
        orderBy: { match: { date: "desc" } },
      },
      payments: { orderBy: { date: "desc" } },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const totalOwed = player.matchPlayers
    .filter((mp) => !mp.match.cancelledAt)
    .reduce((sum, mp) => sum + mp.amountOwed, 0);
  const totalPaid = player.payments
    .filter((p) => !p.cancelledAt)
    .reduce((sum, p) => sum + p.amount, 0);

  return NextResponse.json({ ...player, balance: totalPaid - totalOwed, totalOwed, totalPaid });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const parsed = parseBody(UpdatePlayerSchema, await request.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { name, phone } = parsed.data;

  try {
    const player = await prisma.player.update({
      where: { id },
      data: { name, phone: phone?.trim() || null },
    });
    return NextResponse.json(player);
  } catch (e) {
    console.error("[PUT /api/players/:id]", e);
    return NextResponse.json({ error: "Oyuncu güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.player.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api/players/:id]", e);
    return NextResponse.json({ error: "Oyuncu silinemedi" }, { status: 500 });
  }
}
