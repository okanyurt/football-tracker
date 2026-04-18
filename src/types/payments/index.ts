export interface Payment {
  id: string;
  amount: number;
  date: string;
  notes: string | null;
  isKasa: boolean;
  cancelledAt: string | null;
}

export interface CreatePaymentDto {
  playerId: string;
  amount: number | string;
  notes?: string;
  date?: string;
  isKasa?: boolean;
}
