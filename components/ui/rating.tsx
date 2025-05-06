import React from 'react';
import { cn } from '@/lib/utils';

interface RatingProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Rating: React.FC<RatingProps> = ({
  value,
  max = 5,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const starSize = size === 'lg' ? 32 : size === 'sm' ? 16 : 24;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            className={cn(
              'focus:outline-none',
              disabled ? 'cursor-not-allowed opacity-60' : 'hover:scale-110 transition-transform',
            )}
            aria-label={`Rate ${i + 1} star${i === 0 ? '' : 's'}`}
            onClick={() => !disabled && onChange && onChange(i + 1)}
            disabled={disabled}
          >
            <svg
              width={starSize}
              height={starSize}
              viewBox="0 0 24 24"
              fill={filled ? '#FACC15' : 'none'}
              stroke="#FACC15"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        );
      })}
    </div>
  );
};
