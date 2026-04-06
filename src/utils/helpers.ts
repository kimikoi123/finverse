export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  '#7C5CFC', // rich purple
  '#E5484D', // warm red
  '#F5A623', // golden amber
  '#30A46C', // forest green
  '#3E93F8', // sky blue
  '#D864D8', // orchid pink
  '#E8835F', // coral
  '#2EBDE5', // cyan
  '#8B5CF6', // violet
  '#F76B6B', // salmon
];

export function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]!;
}
