import type { TickStats } from '@/ai/schemas';

export const MAX_HISTORY_CHARS = 100_000;

/**
 * Downsample the simulation history to fit within a character limit.
 * The step size doubles until the serialized size is below the limit.
 */
export function summarizeHistory(
  history: TickStats[],
  maxChars: number = MAX_HISTORY_CHARS,
): { history: TickStats[]; truncated: boolean } {
  if (history.length === 0) return { history, truncated: false };

  let step = 1;
  let sampled = history;
  let truncated = false;

  const serialize = (h: TickStats[]) => JSON.stringify(h).length;

  while (serialize(sampled) > maxChars && step < history.length) {
    step *= 2;
    sampled = history.filter((_, i) => i % step === 0);
    if (
      sampled.length > 0 &&
      history.length > 0 &&
      sampled[sampled.length - 1] !== history[history.length - 1]
    ) {
      sampled.push(history[history.length - 1]);
    }
    truncated = true;
  }

  if (serialize(sampled) > maxChars) {
    truncated = true;
    // Remove earliest ticks until under the limit
    while (serialize(sampled) > maxChars && sampled.length > 1) {
      sampled.shift();
    }
  }

  return { history: sampled, truncated };
}
