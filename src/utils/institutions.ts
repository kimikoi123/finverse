export interface Institution {
  key: string;
  name: string;
  color: string; // brand color for the initials circle
  shortName?: string; // abbreviated name for display
  logo?: string; // logo image URL
}

export const BANKS: Institution[] = [
  { key: 'bpi', name: 'BPI', color: '#a6192e', logo: 'https://www.google.com/s2/favicons?domain=bpi.com.ph&sz=128' },
  { key: 'bdo', name: 'BDO', color: '#003d79', logo: 'https://www.google.com/s2/favicons?domain=bdo.com.ph&sz=128' },
  { key: 'metrobank', name: 'Metrobank', color: '#7b2d8e', logo: 'https://www.google.com/s2/favicons?domain=metrobank.com.ph&sz=128' },
  { key: 'chinabank', name: 'Chinabank', color: '#c8102e', logo: 'https://www.google.com/s2/favicons?domain=chinabanking.com&sz=128' },
  { key: 'cimb', name: 'CIMB', color: '#ec1c24', logo: 'https://www.google.com/s2/favicons?domain=cimb.com.ph&sz=128' },
  { key: 'ctbc', name: 'CTBC', color: '#00704a', logo: 'https://www.google.com/s2/favicons?domain=ctbcbank.com.ph&sz=128' },
  { key: 'eastwest', name: 'EastWest', color: '#0066b3', logo: 'https://www.google.com/s2/favicons?domain=eastwestbanker.com&sz=128' },
  { key: 'gotyme', name: 'GoTyme', color: '#00c4b3', logo: 'https://www.google.com/s2/favicons?domain=gotyme.ph&sz=128' },
  { key: 'hsbc', name: 'HSBC', color: '#db0011', logo: 'https://www.google.com/s2/favicons?domain=hsbc.com.ph&sz=128' },
  { key: 'komo', name: 'Komo', color: '#ff5c35', logo: 'https://www.google.com/s2/favicons?domain=komo.ph&sz=128' },
  { key: 'landbank', name: 'Landbank', color: '#0e6834', logo: 'https://www.google.com/s2/favicons?domain=landbank.com&sz=128' },
  { key: 'pnb', name: 'PNB', color: '#003087', logo: 'https://www.google.com/s2/favicons?domain=pnb.com.ph&sz=128' },
  { key: 'psbank', name: 'PSBank', color: '#0054a6', logo: 'https://www.google.com/s2/favicons?domain=psbank.com.ph&sz=128' },
  { key: 'rcbc', name: 'RCBC', color: '#0033a0', logo: 'https://www.google.com/s2/favicons?domain=rcbc.com&sz=128' },
  { key: 'securitybank', name: 'Security Bank', color: '#00529b', shortName: 'SBank', logo: 'https://www.google.com/s2/favicons?domain=securitybank.com&sz=128' },
  { key: 'unionbank', name: 'UnionBank', color: '#f37021', logo: 'https://www.google.com/s2/favicons?domain=unionbankph.com&sz=128' },
];

export const EWALLETS: Institution[] = [
  { key: 'gcash', name: 'GCash', color: '#007dfe', logo: 'https://www.google.com/s2/favicons?domain=gcash.com&sz=128' },
  { key: 'maya', name: 'Maya', color: '#00c853', logo: 'https://www.google.com/s2/favicons?domain=maya.ph&sz=128' },
  { key: 'shopeepay', name: 'ShopeePay', color: '#ee4d2d', logo: 'https://www.google.com/s2/favicons?domain=shopee.ph&sz=128' },
  { key: 'grabpay', name: 'GrabPay', color: '#00b14f', logo: 'https://www.google.com/s2/favicons?domain=grab.com&sz=128' },
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
