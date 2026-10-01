import { describe, expect, it } from 'vitest';
import { addDays, formatDate } from './format';

describe('IST date helpers', () => {
  it('uses the India calendar date near UTC midnight', () => {
    expect(formatDate(new Date('2026-09-30T20:00:00.000Z'))).toBe('2026-10-01');
    expect(formatDate(new Date('2026-09-30T17:59:00.000Z'))).toBe('2026-09-30');
  });

  it('adds calendar days in Asia/Kolkata', () => {
    expect(addDays(1, new Date('2026-10-01T20:00:00.000Z'))).toBe('2026-10-03');
  });
});
