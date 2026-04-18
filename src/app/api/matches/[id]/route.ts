import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id, deletedAt: null },
    include: { matchPlayers: { include: { player: true } } },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  return NextResponse.json(match);
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const match = await prisma.match.findUnique({ where: { id, deletedAt: null } });
    if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.match.update({
      where: { id },
      data: { cancelledAt: match.cancelledAt ? null : new Date() },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api/matches/:id]", e);
    return NextResponse.json({ error: "Maç güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const match = await prisma.match.findUnique({ where: { id, deletedAt: null } });
    if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.match.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api/matches/:id]", e);
    return NextResponse.json({ error: "Maç silinemedi" }, { status: 500 });
  }
}
