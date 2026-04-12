import { describe, it, expect } from 'vitest';
import { computePhTax } from './phTax';

describe('computePhTax', () => {
  describe('zero and invalid input', () => {
    it('returns all zeros for gross of 0', () => {
      const r = computePhTax(0);
      expect(r.sss).toBe(0);
      expect(r.philHealth).toBe(0);
      expect(r.pagIbig).toBe(0);
      expect(r.totalContributions).toBe(0);
      expect(r.taxableIncome).toBe(0);
      expect(r.withholdingTax).toBe(0);
      expect(r.netTakeHome).toBe(0);
    });

    it('returns all zeros for negative gross', () => {
      const r = computePhTax(-1000);
      expect(r.sss).toBe(0);
      expect(r.netTakeHome).toBe(0);
    });

    it('returns all zeros for NaN gross', () => {
      const r = computePhTax(NaN);
      expect(r.sss).toBe(0);
    });
  });

  describe('SSS employee share', () => {
    it('clamps gross below floor to MSC 5000 (sss = 250)', () => {
      const r = computePhTax(4000);
      expect(r.sss).toBe(250);
    });

    it('computes 5% of MSC rounded down to nearest 500 at mid range (gross 27300 -> MSC 27000 -> 1350)', () => {
      const r = computePhTax(27300);
      expect(r.sss).toBe(1350);
    });

    it('clamps gross above ceiling to MSC 35000 (sss = 1750)', () => {
      const r = computePhTax(150000);
      expect(r.sss).toBe(1750);
    });
  });

  describe('PhilHealth employee share', () => {
    it('pins gross below 10000 to minimum 250', () => {
      const r = computePhTax(8000);
      expect(r.philHealth).toBe(250);
    });

    it('computes 2.5% at 30000 gross -> 750', () => {
      const r = computePhTax(30000);
      expect(r.philHealth).toBe(750);
    });

    it('pins gross above 100000 to maximum 2500', () => {
      const r = computePhTax(150000);
      expect(r.philHealth).toBe(2500);
    });
  });

  describe('Pag-IBIG employee share', () => {
    it('computes 2% at 8000 gross -> 160', () => {
      const r = computePhTax(8000);
      expect(r.pagIbig).toBe(160);
    });

    it('caps at 200 for gross of 10000', () => {
      const r = computePhTax(10000);
      expect(r.pagIbig).toBe(200);
    });

    it('caps at 200 for gross well above 10000', () => {
      const r = computePhTax(50000);
      expect(r.pagIbig).toBe(200);
    });
  });

  describe('withholding tax (TRAIN law, 2023+)', () => {
    it('low gross yields annual taxable under 250000 -> tax 0', () => {
      // Gross 20000: SSS 1000, PhilHealth 500, Pag-IBIG 200 -> total 1700
      // Monthly taxable 18300, annual 219600 (bracket 1) -> 0
      const r = computePhTax(20000);
      expect(r.withholdingTax).toBe(0);
    });
  });

  describe('end-to-end sample: gross 50000', () => {
    // SSS: MSC 35000 * 0.05 = 1750
    // PhilHealth: 50000 * 0.025 = 1250
    // Pag-IBIG: min(50000 * 0.02, 200) = 200
    // Total contributions: 3200
    // Monthly taxable: 46800
    // Annual taxable: 561600
    // Bracket 3 (400k-800k): 22500 + 20% * (561600 - 400000) = 22500 + 32320 = 54820
    // Monthly tax: 54820 / 12 = 4568.33
    // Net: 50000 - 3200 - 4568.33 = 42231.67
    it('matches hand-verified breakdown', () => {
      const r = computePhTax(50000);
      expect(r.sss).toBe(1750);
      expect(r.philHealth).toBe(1250);
      expect(r.pagIbig).toBe(200);
      expect(r.totalContributions).toBe(3200);
      expect(r.taxableIncome).toBe(46800);
      expect(r.withholdingTax).toBe(4568.33);
      expect(r.netTakeHome).toBe(42231.67);
    });
  });

  describe('bracket boundaries', () => {
    it('very high gross lands in bracket 6 (35%)', () => {
      // Gross 1,000,000/month:
      // SSS 1750, PhilHealth 2500, Pag-IBIG 200 -> total 4450
      // Monthly taxable 995550, annual 11946600
      // Bracket 6: 2202500 + 35% * (11946600 - 8000000) = 2202500 + 1381310 = 3583810
      // Monthly: 298650.83
      const r = computePhTax(1000000);
      expect(r.withholdingTax).toBe(298650.83);
    });
  });
});
