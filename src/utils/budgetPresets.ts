export interface BudgetPreset {
  key: string;
  name: string;
  color: string;
  category: 'subscription' | 'telecom' | 'utility';
  logo?: string; // logo image URL
}

export const BUDGET_PRESETS: BudgetPreset[] = [
  // Subscriptions
  { key: 'netflix', name: 'Netflix', color: '#e50914', category: 'subscription', logo: 'https://www.google.com/s2/favicons?domain=netflix.com&sz=128' },
  { key: 'spotify', name: 'Spotify', color: '#1db954', category: 'subscription', logo: 'https://www.google.com/s2/favicons?domain=spotify.com&sz=128' },
  { key: 'youtube-premium', name: 'YouTube Premium', color: '#ff0000', category: 'subscription', logo: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=128' },
  { key: 'disney-plus', name: 'Disney+', color: '#113ccf', category: 'subscription', logo: 'https://www.google.com/s2/favicons?domain=disneyplus.com&sz=128' },
  { key: 'prime-video', name: 'Prime Video', color: '#00a8e1', category: 'subscription', logo: 'https://www.google.com/s2/favicons?domain=primevideo.com&sz=128' },
  { key: 'apple-music', name: 'Apple Music', color: '#fa243c', category: 'subscription', logo: 'https://www.google.com/s2/favicons?domain=music.apple.com&sz=128' },
  { key: 'chatgpt', name: 'ChatGPT', color: '#10a37f', category: 'subscription', logo: 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=128' },
  { key: 'claude', name: 'Claude', color: '#cc785c', category: 'subscription', logo: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=128' },
  { key: 'canva', name: 'Canva', color: '#00c4cc', category: 'subscription', logo: 'https://www.google.com/s2/favicons?domain=canva.com&sz=128' },
  { key: 'google-one', name: 'Google One', color: '#4285f4', category: 'subscription', logo: 'https://www.google.com/s2/favicons?domain=one.google.com&sz=128' },
  { key: 'dropbox', name: 'Dropbox', color: '#0061ff', category: 'subscription', logo: 'https://www.google.com/s2/favicons?domain=dropbox.com&sz=128' },
  { key: 'microsoft-365', name: 'Microsoft 365', color: '#d83b01', category: 'subscription', logo: 'https://www.google.com/s2/favicons?domain=microsoft365.com&sz=128' },
  { key: 'adobe', name: 'Adobe', color: '#ff0000', category: 'subscription', logo: 'https://www.google.com/s2/favicons?domain=adobe.com&sz=128' },
  // Telecom
  { key: 'globe', name: 'Globe', color: '#009cde', category: 'telecom', logo: 'https://www.google.com/s2/favicons?domain=globe.com.ph&sz=128' },
  { key: 'smart', name: 'Smart', color: '#00a651', category: 'telecom', logo: 'https://www.google.com/s2/favicons?domain=smart.com.ph&sz=128' },
  { key: 'dito', name: 'DITO', color: '#ed1c24', category: 'telecom', logo: 'https://www.google.com/s2/favicons?domain=dito.ph&sz=128' },
  { key: 'converge', name: 'Converge', color: '#5b2d8e', category: 'telecom', logo: 'https://www.google.com/s2/favicons?domain=convergeict.com&sz=128' },
  // Utilities
  { key: 'meralco', name: 'Meralco', color: '#f7941d', category: 'utility', logo: 'https://www.google.com/s2/favicons?domain=meralco.com.ph&sz=128' },
  { key: 'manila-water', name: 'Manila Water', color: '#0072bc', category: 'utility', logo: 'https://www.google.com/s2/favicons?domain=manilawater.com&sz=128' },
  { key: 'primewater', name: 'PrimeWater', color: '#e31e24', category: 'utility', logo: 'https://www.google.com/s2/favicons?domain=primewaterinfra.com&sz=128' },
];

export function getBudgetPreset(key: string): BudgetPreset | undefined {
  return BUDGET_PRESETS.find((p) => p.key === key);
}

export function getPresetInitials(name: string): string {
  const words = name.split(/\s+/);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return (words[0]![0]! + (words[1]?.[0] ?? '')).toUpperCase();
}
