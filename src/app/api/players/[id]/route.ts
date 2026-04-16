import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  const totalOwed = player.matchPlayers.reduce(
    (sum, mp) => sum + mp.amountOwed,
    0
  );
  const totalPaid = player.payments.reduce((sum, p) => sum + p.amount, 0);

  return NextResponse.json({ ...player, balance: totalPaid - totalOwed, totalOwed, totalPaid });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, phone } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const player = await prisma.player.update({
    where: { id },
    data: { name: name.trim(), phone: phone?.trim() || null },
  });

  return NextResponse.json(player);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.player.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
