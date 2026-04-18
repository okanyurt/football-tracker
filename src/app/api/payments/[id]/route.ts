import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const payment = await prisma.payment.findUnique({ where: { id, deletedAt: null } });
    if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.payment.update({
      where: { id },
      data: { cancelledAt: payment.cancelledAt ? null : new Date() },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api/payments/:id]", e);
    return NextResponse.json({ error: "Ödeme güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const payment = await prisma.payment.findUnique({ where: { id, deletedAt: null } });
    if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.payment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api/payments/:id]", e);
    return NextResponse.json({ error: "Ödeme silinemedi" }, { status: 500 });
  }
}
