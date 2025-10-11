import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      viewBox="0 0 200 60" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      aria-label="HadirKu Logo"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3b82f6' }} />
          <stop offset="100%" style={{ stopColor: '#60a5fa' }} />
        </linearGradient>
      </defs>
      
      {/* Icon Part */}
      <g transform="translate(0, 5)">
        <path 
          d="M25 0 C11.2 0 0 11.2 0 25 C0 42.5 25 50 25 50 C25 50 50 42.5 50 25 C50 11.2 38.8 0 25 0 Z" 
          fill="url(#logoGradient)" 
        />
        <path 
          d="M15 25 L22 32 L35 18" 
          stroke="white" 
          strokeWidth="5" 
          fill="none" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </g>

      {/* Text Part */}
      <text 
        x="60" 
        y="42" 
        fontFamily="sans-serif"
        fontSize="36" 
        fontWeight="bold" 
        fill="#e2e8f0"
      >
        HadirKu
      </text>
    </svg>
  );
};

export default Logo;
