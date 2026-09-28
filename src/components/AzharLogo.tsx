import React from 'react';

interface AzharLogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'color';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AzharLogo: React.FC<AzharLogoProps> = ({ 
  className = '', 
  variant = 'light',
  size = 'md' 
}) => {
  const isLight = variant === 'light'; // Light text for dark headers
  const isDark = variant === 'dark';   // Dark text for white paper/cards

  const textPrimaryClass = isLight ? 'text-white' : isDark ? 'text-slate-900' : 'text-slate-900';
  const textSecondaryClass = isLight ? 'text-slate-300' : isDark ? 'text-slate-700' : 'text-[#29b4c4]';
  const iconStrokeClass = isLight ? '#29b4c4' : '#1e293b';
  const leafFillClass = isLight ? '#29b4c4' : '#1e293b';

  const heights = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
    xl: 'h-20'
  };

  return (
    <div className={`flex items-center gap-3 ${heights[size]} ${className}`}>
      {/* Visual Vector Icon - House with Sprouting Leaves matching Logo */}
      <svg 
        viewBox="0 0 120 120" 
        className="h-full w-auto aspect-square flex-shrink-0"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* House Outline */}
        <path 
          d="M 30 100 L 30 65 L 60 40 L 90 65 L 90 100 Z" 
          stroke={iconStrokeClass} 
          strokeWidth="6" 
          strokeLinejoin="round" 
          fill={isLight ? "rgba(41, 180, 196, 0.15)" : "none"}
        />
        {/* Door */}
        <path 
          d="M 46 100 L 46 76 Q 46 70 52 70 L 58 70 Q 64 70 64 76 L 64 100 Z" 
          fill={leafFillClass} 
        />
        {/* Window */}
        <rect x="74" y="70" width="10" height="12" rx="2" fill={leafFillClass} />

        {/* Top Sprouting Leaves from Roof */}
        <g stroke={iconStrokeClass} strokeWidth="5" fill={leafFillClass}>
          {/* Center Leaf */}
          <path d="M 60 40 C 50 22 55 8 60 2 C 65 8 70 22 60 40 Z" />
          {/* Left Leaf */}
          <path d="M 58 35 C 40 32 30 20 28 12 C 38 12 50 22 58 35 Z" />
          {/* Right Leaf */}
          <path d="M 62 35 C 80 32 90 20 92 12 C 82 12 70 22 62 35 Z" />
        </g>

        {/* Bottom Ground & Sprout Base */}
        <path 
          d="M 20 100 Q 60 112 100 100" 
          stroke={iconStrokeClass} 
          strokeWidth="6" 
          strokeLinecap="round" 
        />
        <path 
          d="M 60 100 L 60 116 C 45 118 35 110 32 102 C 42 100 52 106 60 116 Z" 
          fill={leafFillClass} 
        />
      </svg>

      {/* Typography */}
      <div className="flex flex-col justify-center leading-none">
        <span className={`font-black tracking-wider uppercase text-lg sm:text-xl font-sans ${textPrimaryClass}`}>
          AZHAR
        </span>
        <span className={`font-semibold tracking-[0.25em] uppercase text-[10px] sm:text-xs font-sans ${textSecondaryClass}`}>
          RESIDENCE
        </span>
      </div>
    </div>
  );
};
