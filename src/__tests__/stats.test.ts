import { RunningStats, calculateGini } from '../utils/stats';

describe('stats utilities', () => {
  describe('RunningStats', () => {
    test("RunningStats matches Math", () => {
      const xs = [3, 1, 4, 1, 5, 9];
      const rs = new RunningStats();
      xs.forEach(rs.push.bind(rs));
      
      const mean = xs.reduce((a, b) => a + b) / xs.length;
      const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (xs.length - 1));
      
      expect(rs.avg).toBeCloseTo(mean);
      expect(rs.sd).toBeCloseTo(sd);
    });

    test("correctly tracks count, min, and max", () => {
        const xs = [3, 1, 4, 1, 5, 9];
        const rs = new RunningStats();
        xs.forEach(x => rs.push(x));
        expect(rs.count).toBe(6);
        expect(rs.min).toBe(1);
        expect(rs.max).toBe(9);
      });
  });

  describe('calculateGini', () => {
    test('returns 0 for perfect equality', () => {
      const values = [10, 10, 10, 10];
      expect(calculateGini(values)).toBe(0);
    });

    test('returns a correct value for a simple inequality case', () => {
      const values = [0, 0, 0, 10];
      expect(calculateGini(values)).toBeCloseTo(0.75);
    });

    test('handles an empty array', () => {
      expect(calculateGini([])).toBe(0);
    });
    
    test('handles all zeros', () => {
      expect(calculateGini([0, 0, 0, 0])).toBe(0);
    });
  });
});
