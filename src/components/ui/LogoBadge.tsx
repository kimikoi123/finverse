import { useState, useEffect } from 'react';

interface LogoBadgeProps {
  logo?: string;
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'round' | 'rounded';
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-11 h-11 text-xs',
} as const;

const IMG_SIZES = { sm: 20, md: 26, lg: 28 } as const;

function getInitials(name: string): string {
  const words = name.split(/\s+/);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return (words[0]![0]! + (words[1]?.[0] ?? '')).toUpperCase();
}

export default function LogoBadge({
  logo,
  name,
  color,
  size = 'md',
  variant = 'round',
}: LogoBadgeProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [logo]);

  const sizeClass = SIZE_CLASSES[size];
  const roundClass = variant === 'round' ? 'rounded-full' : 'rounded-lg';
  const showImage = logo && !imgError;

  if (showImage) {
    return (
      <div
        className={`${sizeClass} ${roundClass} bg-white flex items-center justify-center shrink-0 overflow-hidden`}
      >
        <img
          src={logo}
          alt={name}
          width={IMG_SIZES[size]}
          height={IMG_SIZES[size]}
          className="object-contain"
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} ${roundClass} flex items-center justify-center shrink-0 font-bold text-white`}
      style={{ backgroundColor: color }}
    >
      {getInitials(name)}
    </div>
  );
}
