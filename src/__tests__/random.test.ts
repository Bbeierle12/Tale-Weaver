import { rng, setSeed } from '../utils/random';

describe('random utility', () => {
  test('mulberry32 is deterministic', () => {
    setSeed(123);
    const seq1 = Array.from({ length: 5 }, rng);
    setSeed(123);
    const seq2 = Array.from({ length: 5 }, rng);
    expect(seq1).toEqual(seq2);
  });
});
