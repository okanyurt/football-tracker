export interface Player {
  id: string;
  name: string;
  phone: string | null;
  isExempt: boolean;
  removedFromGroup: boolean;
  isGuest: boolean;
  positions: string;
  balance: number;
  totalOwed: number;
  totalPaid: number;
  matchCount: number;
  missedStreak: number;
  avgRating: number | null;
}

export interface MatchPlayerEntry {
  id: string;
  amountOwed: number;
  match: {
    id: string;
    date: string;
    location: string | null;
    totalCost: number;
    cancelledAt: string | null;
  };
}

export interface PaymentEntry {
  id: string;
  amount: number;
  date: string;
  notes: string | null;
  isKasa: boolean;
  cancelledAt: string | null;
}

export interface AtRiskPlayer {
  id: string;
  name: string;
}

export interface AtRiskResult {
  players: AtRiskPlayer[];
  matchesChecked: number;
}

export interface PlayerDetail extends Player {
  matchPlayers: MatchPlayerEntry[];
  payments: PaymentEntry[];
}
