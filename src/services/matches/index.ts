import type { MatchListItem, MatchDetail, CreateMatchDto, UpdateTeamsDto, MatchRatingData, SuggestTeamsResult } from "@/types/matches";
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

export async function togglePlayedMatch(id: string): Promise<Result<MatchListItem>> {
  const res = await fetch(`/api/matches/${id}/played`, { method: "PATCH" });
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

export async function addParticipants(matchId: string, playerIds: string[], goalkeeperPlayerIds?: string[]): Promise<Result<MatchDetail>> {
  const res = await fetch(`/api/matches/${matchId}/participants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerIds, goalkeeperPlayerIds }),
  });
  return handle(res, "Oyuncu eklenemedi");
}

export async function updateParticipants(matchId: string, playerIds: string[], goalkeeperPlayerIds?: string[]): Promise<Result<MatchDetail>> {
  const res = await fetch(`/api/matches/${matchId}/participants`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerIds, goalkeeperPlayerIds }),
  });
  return handle(res, "Oyuncular güncellenemedi");
}

export async function removeParticipant(matchId: string, playerId: string): Promise<Result<MatchDetail>> {
  const res = await fetch(`/api/matches/${matchId}/participants`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId }),
  });
  return handle(res, "Oyuncu çıkarılamadı");
}

export async function getMatchRatings(matchId: string): Promise<Result<MatchRatingData>> {
  const res = await fetch(`/api/matches/${matchId}/ratings`);
  return handle(res, "Puanlar yüklenemedi");
}

export async function submitRatings(
  matchId: string,
  raterName: string,
  ratings: Record<string, number>
): Promise<Result<MatchRatingData>> {
  const res = await fetch(`/api/matches/${matchId}/ratings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raterName, ratings }),
  });
  return handle(res, "Puanlar kaydedilemedi");
}

export async function deleteRater(matchId: string, raterName: string): Promise<Result<MatchRatingData>> {
  const res = await fetch(`/api/matches/${matchId}/ratings`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raterName }),
  });
  return handle(res, "Puanlama silinemedi");
}

export async function toggleHasPaid(matchId: string, playerId: string): Promise<Result<void>> {
  const res = await fetch(`/api/matches/${matchId}/participants/${playerId}/paid`, { method: "PATCH" });
  return handle(res, "Ödeme durumu güncellenemedi");
}

export async function payFromKasa(matchId: string, playerId: string): Promise<Result<void>> {
  const res = await fetch(`/api/matches/${matchId}/participants/${playerId}/pay-from-kasa`, { method: "PATCH" });
  return handle(res, "Kasadan ödeme yapılamadı");
}

export async function suggestTeams(matchId: string): Promise<Result<SuggestTeamsResult>> {
  const res = await fetch(`/api/matches/${matchId}/suggest-teams`);
  return handle(res, "Takım önerisi alınamadı");
}

export async function updateScore(matchId: string, team1Score: number | null, team2Score: number | null): Promise<Result<MatchDetail>> {
  const res = await fetch(`/api/matches/${matchId}/score`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team1Score, team2Score }),
  });
  return handle(res, "Skor kaydedilemedi");
}

export async function updatePlayerStats(matchId: string, playerId: string, goals: number, assists: number): Promise<Result<void>> {
  const res = await fetch(`/api/matches/${matchId}/participants/${playerId}/stats`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goals, assists }),
  });
  return handle(res, "Oyuncu istatistikleri kaydedilemedi");
}
