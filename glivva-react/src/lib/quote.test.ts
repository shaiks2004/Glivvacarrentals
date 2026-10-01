import { describe, expect, it } from 'vitest';
import { FLEET } from '../data/fleet';
import { calculateQuote } from './quote';

describe('booking quote', () => {
  it('calculates a self-drive two-day quote with GST', () => {
    const quote = calculateQuote({
      car: FLEET[0],
      from: '2026-10-01',
      ft: '10:00',
      to: '2026-10-03',
      tt: '10:00',
      drv: 'self',
      addons: [],
    });

    expect(quote?.days).toBe(2);
    expect(quote?.base).toBe(3600);
    expect(quote?.gst).toBe(648);
    expect(quote?.total).toBe(4248);
  });

  it('adds chauffeur and selected add-ons per rental day', () => {
    const quote = calculateQuote({
      car: FLEET[0],
      from: '2026-10-01',
      ft: '10:00',
      to: '2026-10-02',
      tt: '10:00',
      drv: 'chauffeur',
      addons: ['child', 'gps'],
    });

    expect(quote?.driver).toBe(1000);
    expect(quote?.addons).toBe(450);
    expect(quote?.total).toBe(3835);
  });
});