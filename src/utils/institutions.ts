export interface Institution {
  key: string;
  name: string;
  color: string; // brand color for the initials circle
  shortName?: string; // abbreviated name for display
}

export const BANKS: Institution[] = [
  { key: 'bpi', name: 'BPI', color: '#a6192e' },
  { key: 'bdo', name: 'BDO', color: '#003d79' },
  { key: 'metrobank', name: 'Metrobank', color: '#7b2d8e' },
  { key: 'chinabank', name: 'Chinabank', color: '#c8102e' },
  { key: 'cimb', name: 'CIMB', color: '#ec1c24' },
  { key: 'ctbc', name: 'CTBC', color: '#00704a' },
  { key: 'eastwest', name: 'EastWest', color: '#0066b3' },
  { key: 'gotyme', name: 'GoTyme', color: '#00c4b3' },
  { key: 'hsbc', name: 'HSBC', color: '#db0011' },
  { key: 'komo', name: 'Komo', color: '#ff5c35' },
  { key: 'landbank', name: 'Landbank', color: '#0e6834' },
  { key: 'pnb', name: 'PNB', color: '#003087' },
  { key: 'psbank', name: 'PSBank', color: '#0054a6' },
  { key: 'rcbc', name: 'RCBC', color: '#0033a0' },
  { key: 'securitybank', name: 'Security Bank', color: '#00529b', shortName: 'SBank' },
  { key: 'unionbank', name: 'UnionBank', color: '#f37021' },
];

export const EWALLETS: Institution[] = [
  { key: 'gcash', name: 'GCash', color: '#007dfe' },
  { key: 'maya', name: 'Maya', color: '#00c853' },
  { key: 'shopeepay', name: 'ShopeePay', color: '#ee4d2d' },
  { key: 'grabpay', name: 'GrabPay', color: '#00b14f' },
];

export const ALL_INSTITUTIONS = [...BANKS, ...EWALLETS];

export function getInstitution(key: string): Institution | undefined {
  return ALL_INSTITUTIONS.find((i) => i.key === key);
}

export function getInstitutionInitials(name: string): string {
  const words = name.split(/\s+/);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}
