// Pure helpers for generating single-elimination brackets.

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface PairingResult<T> {
  /** Pairs that play in round 1. */
  matches: Array<[T, T]>;
  /** Players who get a bye and advance directly to round 2. */
  byes: T[];
}

/**
 * Build round-1 pairings for `players`. If the count isn't a power of two,
 * the fewest possible players get byes into round 2.
 *
 * Algorithm: round to next power of two. The difference is the number of
 * byes. Randomly shuffle, take that many for byes, pair the rest.
 */
export function buildRound1<T>(players: readonly T[]): PairingResult<T> {
  const n = players.length;
  if (n < 2) return { matches: [], byes: [...players] };

  const nextPow2 = 1 << Math.ceil(Math.log2(n));
  const byeCount = nextPow2 - n;

  const shuffled = shuffle(players);
  const byes = shuffled.slice(0, byeCount);
  const playing = shuffled.slice(byeCount);

  const matches: Array<[T, T]> = [];
  for (let i = 0; i < playing.length; i += 2) {
    matches.push([playing[i], playing[i + 1]]);
  }
  return { matches, byes };
}

/**
 * Pair winners (and any leftover byes) for the next round. Returns an empty
 * `matches` array if there's only one survivor.
 */
export function buildNextRound<T>(survivors: readonly T[]): {
  matches: Array<[T, T]>;
  champion: T | null;
} {
  if (survivors.length === 0) return { matches: [], champion: null };
  if (survivors.length === 1) return { matches: [], champion: survivors[0] };

  const shuffled = shuffle(survivors);
  const matches: Array<[T, T]> = [];
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    matches.push([shuffled[i], shuffled[i + 1]]);
  }
  // Odd survivor → bye (highly unusual after round 1 for pow-2 brackets,
  // but possible if a player dropped). Carry them forward: caller can
  // re-call this fn next round with the bye player included.
  return { matches, champion: null };
}
