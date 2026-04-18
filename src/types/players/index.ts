export interface Player {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  totalOwed: number;
  totalPaid: number;
  matchCount: number;
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

export interface PlayerDetail extends Player {
  matchPlayers: MatchPlayerEntry[];
  payments: PaymentEntry[];
}
