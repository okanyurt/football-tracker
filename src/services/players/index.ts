import type { Player, PlayerDetail, AtRiskResult } from "@/types/players";
import { handle, type Result } from "@/services/shared";

export async function getPlayers(): Promise<Result<Player[]>> {
  const res = await fetch("/api/players");
  return handle(res, "Oyuncular yüklenemedi");
}

export async function getPlayer(id: string): Promise<Result<PlayerDetail>> {
  const res = await fetch(`/api/players/${id}`);
  return handle(res, "Oyuncu bulunamadı");
}

export async function createPlayer(
  name: string,
  phone?: string,
  status?: { isGuest?: boolean; isExempt?: boolean; removedFromGroup?: boolean }
): Promise<Result<Player>> {
  const res = await fetch("/api/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone, ...status }),
  });
  return handle(res, "Oyuncu eklenemedi");
}

export async function updatePlayer(
  id: string,
  name: string,
  phone?: string,
  isExempt?: boolean,
  positions?: string,
  isGuest?: boolean,
  removedFromGroup?: boolean
): Promise<Result<Player>> {
  const res = await fetch(`/api/players/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone, isExempt, positions, isGuest, removedFromGroup }),
  });
  return handle(res, "Oyuncu güncellenemedi");
}

export async function removeFromGroup(player: Player): Promise<Result<Player>> {
  const res = await fetch(`/api/players/${player.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: player.name, phone: player.phone, positions: player.positions,
      isExempt: false, isGuest: false, removedFromGroup: true,
    }),
  });
  return handle(res, "Oyuncu güncellenemedi");
}

export async function addToGroup(player: Player): Promise<Result<Player>> {
  const res = await fetch(`/api/players/${player.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: player.name, phone: player.phone, positions: player.positions,
      isExempt: false, isGuest: false, removedFromGroup: false,
    }),
  });
  return handle(res, "Oyuncu güncellenemedi");
}

export async function toggleRemovedFromGroup(player: Player): Promise<Result<Player>> {
  return player.removedFromGroup ? addToGroup(player) : removeFromGroup(player);
}

export async function deletePlayer(id: string): Promise<Result<{ success: true }>> {
  const res = await fetch(`/api/players/${id}`, { method: "DELETE" });
  return handle(res, "Oyuncu silinemedi");
}

export async function getAtRiskPlayers(): Promise<Result<AtRiskResult>> {
  const res = await fetch("/api/players/at-risk");
  return handle(res, "Risk listesi yüklenemedi");
}
