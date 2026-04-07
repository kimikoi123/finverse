export interface BudgetPreset {
  key: string;
  name: string;
  color: string;
  category: 'subscription' | 'telecom' | 'utility';
}

export const BUDGET_PRESETS: BudgetPreset[] = [
  // Subscriptions
  { key: 'netflix', name: 'Netflix', color: '#e50914', category: 'subscription' },
  { key: 'spotify', name: 'Spotify', color: '#1db954', category: 'subscription' },
  { key: 'youtube-premium', name: 'YouTube Premium', color: '#ff0000', category: 'subscription' },
  { key: 'disney-plus', name: 'Disney+', color: '#113ccf', category: 'subscription' },
  { key: 'prime-video', name: 'Prime Video', color: '#00a8e1', category: 'subscription' },
  { key: 'apple-music', name: 'Apple Music', color: '#fa243c', category: 'subscription' },
  { key: 'chatgpt', name: 'ChatGPT', color: '#10a37f', category: 'subscription' },
  { key: 'canva', name: 'Canva', color: '#00c4cc', category: 'subscription' },
  { key: 'google-one', name: 'Google One', color: '#4285f4', category: 'subscription' },
  { key: 'dropbox', name: 'Dropbox', color: '#0061ff', category: 'subscription' },
  { key: 'microsoft-365', name: 'Microsoft 365', color: '#d83b01', category: 'subscription' },
  { key: 'adobe', name: 'Adobe', color: '#ff0000', category: 'subscription' },
  // Telecom
  { key: 'globe', name: 'Globe', color: '#009cde', category: 'telecom' },
  { key: 'smart', name: 'Smart', color: '#00a651', category: 'telecom' },
  { key: 'dito', name: 'DITO', color: '#ed1c24', category: 'telecom' },
  { key: 'converge', name: 'Converge', color: '#5b2d8e', category: 'telecom' },
  // Utilities
  { key: 'meralco', name: 'Meralco', color: '#f7941d', category: 'utility' },
  { key: 'manila-water', name: 'Manila Water', color: '#0072bc', category: 'utility' },
  { key: 'primewater', name: 'PrimeWater', color: '#e31e24', category: 'utility' },
];

export function getBudgetPreset(key: string): BudgetPreset | undefined {
  return BUDGET_PRESETS.find((p) => p.key === key);
}

export function getPresetInitials(name: string): string {
  const words = name.split(/\s+/);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return (words[0]![0]! + (words[1]?.[0] ?? '')).toUpperCase();
}
