import type { TickStats } from '@/ai/schemas';

const MAX_HISTORY_ENTRIES = 2000;
const HEAD_COUNT = 50; // Keep the first N entries
const TAIL_COUNT = 50; // Keep the last N entries

interface SummarizeHistoryResult {
  history: TickStats[];
  truncated: boolean;
}

/**
 * Downsamples the simulation history if it exceeds a certain size to prevent
 * hitting AI context window limits. It preserves the beginning and end of the
 * simulation and samples from the middle.
 *
 * @param fullHistory The complete array of simulation tick statistics.
 * @returns An object containing the potentially pruned history and a flag
 *          indicating if truncation occurred.
 */
export function summarizeHistory(
  fullHistory: TickStats[]
): SummarizeHistoryResult {
  if (fullHistory.length <= MAX_HISTORY_ENTRIES) {
    return { history: fullHistory, truncated: false };
  }

  const head = fullHistory.slice(0, HEAD_COUNT);
  const tail = fullHistory.slice(-TAIL_COUNT);
  const middle = fullHistory.slice(HEAD_COUNT, -TAIL_COUNT);

  const middleSampleSize = MAX_HISTORY_ENTRIES - HEAD_COUNT - TAIL_COUNT;
  const middleSample: TickStats[] = [];
  const step = Math.max(1, Math.floor(middle.length / middleSampleSize));

  for (let i = 0; i < middle.length; i += step) {
    if (middleSample.length < middleSampleSize) {
      middleSample.push(middle[i]);
    }
  }

  return {
    history: [...head, ...middleSample, ...tail],
    truncated: true,
  };
}
