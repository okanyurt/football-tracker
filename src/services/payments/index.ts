import type { Payment, CreatePaymentDto } from "@/types/payments";
import { handle, type Result } from "@/services/shared";

export async function createPayment(payload: CreatePaymentDto): Promise<Result<Payment>> {
  const res = await fetch("/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle(res, "Ödeme kaydedilemedi");
}

export async function toggleCancelPayment(id: string): Promise<Result<Payment>> {
  const res = await fetch(`/api/payments/${id}`, { method: "PATCH" });
  return handle(res, "Ödeme güncellenemedi");
}
