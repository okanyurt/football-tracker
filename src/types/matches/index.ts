export interface BasicPlayer {
  id: string;
  name: string;
  positions: string;
}

export interface MatchPlayer {
  id: string;
  playerId: string;
  amountOwed: number;
  isGoalkeeper: boolean;
  hasPaid: boolean;
  team: number | null;
  goals: number;
  assists: number;
  keyPlays: number;
  shots: number;
  player: BasicPlayer;
  playerBalance: number;
}

export interface MatchListItem {
  id: string;
  date: string;
  location: string | null;
  totalCost: number;
  notes: string | null;
  cancelledAt: string | null;
  playedAt: string | null;
  goalkeeperFree: boolean;
  isPrivate: boolean;
  team1Score: number | null;
  team2Score: number | null;
  matchPlayers: { isGoalkeeper: boolean; player: BasicPlayer }[];
}

export interface MatchDetail {
  id: string;
  date: string;
  location: string | null;
  totalCost: number;
  notes: string | null;
  team1Name: string | null;
  team2Name: string | null;
  team1Score: number | null;
  team2Score: number | null;
  topRunnerId: string | null;
  goalkeeperFree: boolean;
  isPrivate: boolean;
  matchPlayers: MatchPlayer[];
}

export interface CreateMatchDto {
  date: string;
  location?: string;
  totalCost: number;
  notes?: string;
  playerIds: string[];
  goalkeeperFree?: boolean;
  isPrivate?: boolean;
  goalkeeperPlayerIds?: string[];
  perPlayerAmount?: number;
  team1Name?: string;
  team2Name?: string;
  playerTeams?: Record<string, 1 | 2>;
}

export interface UpdateMatchCostDto {
  totalCost: number;
}

export interface UpdateTeamsDto {
  team1Name: string;
  team2Name: string;
  playerTeams: Record<string, 1 | 2>;
}

export interface PlayerRatingSummary {
  playerId: string;
  playerName: string;
  average: number;
  count: number;
  ratings: { raterName: string; rating: number }[];
}

export interface MatchRatingData {
  raters: string[];
  players: PlayerRatingSummary[];
}

export interface SuggestTeamsResult {
  team1: string[];
  team2: string[];
  playerRatings: Record<string, number>;
}
