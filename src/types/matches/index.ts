export interface BasicPlayer {
  id: string;
  name: string;
}

export interface MatchPlayer {
  id: string;
  playerId: string;
  amountOwed: number;
  isGoalkeeper: boolean;
  team: number | null;
  player: BasicPlayer;
}

export interface MatchListItem {
  id: string;
  date: string;
  location: string | null;
  totalCost: number;
  notes: string | null;
  cancelledAt: string | null;
  goalkeeperFree: boolean;
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
  matchPlayers: MatchPlayer[];
}

export interface CreateMatchDto {
  date: string;
  location?: string;
  totalCost: number;
  notes?: string;
  playerIds: string[];
  goalkeeperFree?: boolean;
  goalkeeperPlayerIds?: string[];
  perPlayerAmount?: number;
  team1Name?: string;
  team2Name?: string;
  playerTeams?: Record<string, 1 | 2>;
}

export interface UpdateTeamsDto {
  team1Name: string;
  team2Name: string;
  playerTeams: Record<string, 1 | 2>;
}
