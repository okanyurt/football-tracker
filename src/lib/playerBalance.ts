type MatchPlayer = {
  amountOwed: number;
  match: { cancelledAt: Date | null; deletedAt: Date | null };
};

type Payment = {
  amount: number;
  cancelledAt: Date | null;
  deletedAt: Date | null;
};

export function calculatePlayerBalance(
  matchPlayers: MatchPlayer[],
  payments: Payment[]
) {
  const activeMatches = matchPlayers.filter(
    (mp) => !mp.match.cancelledAt && !mp.match.deletedAt
  );
  const totalOwed = activeMatches.reduce((sum, mp) => sum + mp.amountOwed, 0);
  const totalPaid = payments
    .filter((p) => !p.cancelledAt && !p.deletedAt)
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    balance: totalPaid - totalOwed,
    totalOwed,
    totalPaid,
    matchCount: activeMatches.length,
  };
}
