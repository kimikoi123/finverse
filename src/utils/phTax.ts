// UPDATED: 2026-04-11 — verify against
// https://www.bir.gov.ph/ (TRAIN law tax table, 2023+)
// https://www.sss.gov.ph/ (contribution schedule)
// https://www.philhealth.gov.ph/ (premium contribution table)
// https://www.pagibigfund.gov.ph/ (HDMF contribution rates)

export interface PhTaxBreakdown {
  sss: number;
  philHealth: number;
  pagIbig: number;
  totalContributions: number;
  taxableIncome: number;
  withholdingTax: number;
  netTakeHome: number;
}

const SSS_EMPLOYEE_RATE = 0.045;
const SSS_MSC_FLOOR = 5000;
const SSS_MSC_CEILING = 35000;
const SSS_MSC_STEP = 500;

const PHILHEALTH_RATE = 0.025;
const PHILHEALTH_FLOOR_SALARY = 10000;
const PHILHEALTH_CEILING_SALARY = 100000;

const PAGIBIG_RATE = 0.02;
const PAGIBIG_CAP = 200;

interface TaxBracket {
  upTo: number;      // annual taxable income upper bound (exclusive); Infinity for top bracket
  base: number;     // flat tax at the start of this bracket
  rate: number;     // marginal rate on excess over `over`
  over: number;     // threshold the marginal rate applies to
}

const BIR_ANNUAL_BRACKETS: TaxBracket[] = [
  { upTo: 250000,   base: 0,       rate: 0,    over: 0 },
  { upTo: 400000,   base: 0,       rate: 0.15, over: 250000 },
  { upTo: 800000,   base: 22500,   rate: 0.20, over: 400000 },
  { upTo: 2000000,  base: 102500,  rate: 0.25, over: 800000 },
  { upTo: 8000000,  base: 402500,  rate: 0.30, over: 2000000 },
  { upTo: Infinity, base: 2202500, rate: 0.35, over: 8000000 },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function computeSss(gross: number): number {
  const stepped = Math.floor(gross / SSS_MSC_STEP) * SSS_MSC_STEP;
  const msc = clamp(stepped, SSS_MSC_FLOOR, SSS_MSC_CEILING);
  return round2(msc * SSS_EMPLOYEE_RATE);
}

function computePhilHealth(gross: number): number {
  const base = clamp(gross, PHILHEALTH_FLOOR_SALARY, PHILHEALTH_CEILING_SALARY);
  return round2(base * PHILHEALTH_RATE);
}

function computePagIbig(gross: number): number {
  return round2(Math.min(gross * PAGIBIG_RATE, PAGIBIG_CAP));
}

function computeAnnualIncomeTax(annualTaxable: number): number {
  if (annualTaxable <= 0) return 0;
  for (const bracket of BIR_ANNUAL_BRACKETS) {
    if (annualTaxable <= bracket.upTo) {
      return bracket.base + (annualTaxable - bracket.over) * bracket.rate;
    }
  }
  return 0;
}

const EMPTY: PhTaxBreakdown = {
  sss: 0,
  philHealth: 0,
  pagIbig: 0,
  totalContributions: 0,
  taxableIncome: 0,
  withholdingTax: 0,
  netTakeHome: 0,
};

export function computePhTax(monthlyGross: number): PhTaxBreakdown {
  if (!Number.isFinite(monthlyGross) || monthlyGross <= 0) {
    return EMPTY;
  }

  const sss = computeSss(monthlyGross);
  const philHealth = computePhilHealth(monthlyGross);
  const pagIbig = computePagIbig(monthlyGross);
  const totalContributions = round2(sss + philHealth + pagIbig);

  const taxableIncome = round2(monthlyGross - totalContributions);
  const annualTaxable = taxableIncome * 12;
  const withholdingTax = round2(computeAnnualIncomeTax(annualTaxable) / 12);
  const netTakeHome = round2(monthlyGross - totalContributions - withholdingTax);

  return {
    sss,
    philHealth,
    pagIbig,
    totalContributions,
    taxableIncome,
    withholdingTax,
    netTakeHome,
  };
}
