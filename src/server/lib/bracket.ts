// Pure helpers for single-elimination brackets with random pairing + byes.

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface PairingResult<T> {
  matches: Array<[T, T]>;
  byes: T[];
}

/**
 * Build pairings for a set of players. Pairs up as many as possible; if the
 * count is odd, exactly one random player gets a bye.
 */
export function buildPairings<T>(players: readonly T[]): PairingResult<T> {
  if (players.length < 2) return { matches: [], byes: [...players] };
  const shuffled = shuffle(players);
  const byes: T[] = [];
  if (shuffled.length % 2 === 1) {
    byes.push(shuffled.pop() as T);
  }
  const matches: Array<[T, T]> = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push([shuffled[i], shuffled[i + 1]]);
  }
  return { matches, byes };
}
