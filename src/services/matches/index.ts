import type { MatchListItem, MatchDetail, CreateMatchDto, UpdateTeamsDto } from "@/types/matches";
import { handle, type Result } from "@/services/shared";

export async function getMatches(): Promise<Result<MatchListItem[]>> {
  const res = await fetch("/api/matches");
  return handle(res, "Maçlar yüklenemedi");
}

export async function getMatch(id: string): Promise<Result<MatchDetail>> {
  const res = await fetch(`/api/matches/${id}`);
  return handle(res, "Maç bulunamadı");
}

export async function createMatch(payload: CreateMatchDto): Promise<Result<MatchDetail>> {
  const res = await fetch("/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle(res, "Maç oluşturulamadı");
}

export async function toggleCancelMatch(id: string): Promise<Result<MatchListItem>> {
  const res = await fetch(`/api/matches/${id}`, { method: "PATCH" });
  return handle(res, "Maç güncellenemedi");
}

export async function updateTeams(id: string, payload: UpdateTeamsDto): Promise<Result<MatchDetail>> {
  const res = await fetch(`/api/matches/${id}/teams`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle(res, "Takımlar kaydedilemedi");
}

export async function addParticipants(matchId: string, playerIds: string[]): Promise<Result<MatchDetail>> {
  const res = await fetch(`/api/matches/${matchId}/participants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerIds }),
  });
  return handle(res, "Oyuncu eklenemedi");
}

export async function removeParticipant(matchId: string, playerId: string): Promise<Result<MatchDetail>> {
  const res = await fetch(`/api/matches/${matchId}/participants`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId }),
  });
  return handle(res, "Oyuncu çıkarılamadı");
}
