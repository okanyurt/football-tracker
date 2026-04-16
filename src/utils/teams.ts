export function cycleTeam(
  prev: Record<string, 1 | 2>,
  playerId: string
): Record<string, 1 | 2> {
  const current = prev[playerId];
  if (!current) return { ...prev, [playerId]: 1 };
  if (current === 1) return { ...prev, [playerId]: 2 };
  const next = { ...prev };
  delete next[playerId];
  return next;
}
