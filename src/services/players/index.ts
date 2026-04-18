import type { Player, PlayerDetail } from "@/types/players";
import { handle, type Result } from "@/services/shared";

export async function getPlayers(): Promise<Result<Player[]>> {
  const res = await fetch("/api/players");
  return handle(res, "Oyuncular yüklenemedi");
}

export async function getPlayer(id: string): Promise<Result<PlayerDetail>> {
  const res = await fetch(`/api/players/${id}`);
  return handle(res, "Oyuncu bulunamadı");
}

export async function createPlayer(name: string, phone?: string): Promise<Result<Player>> {
  const res = await fetch("/api/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone }),
  });
  return handle(res, "Oyuncu eklenemedi");
}

export async function updatePlayer(id: string, name: string, phone?: string): Promise<Result<Player>> {
  const res = await fetch(`/api/players/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone }),
  });
  return handle(res, "Oyuncu güncellenemedi");
}

export async function deletePlayer(id: string): Promise<Result<{ success: true }>> {
  const res = await fetch(`/api/players/${id}`, { method: "DELETE" });
  return handle(res, "Oyuncu silinemedi");
}
