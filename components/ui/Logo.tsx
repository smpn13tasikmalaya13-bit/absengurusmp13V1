import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <h1 className={`text-5xl font-extrabold text-slate-100 tracking-tight ${className}`}>
      Hadir<span className="text-emerald-500">Ku</span>
    </h1>
  );
};

export default Logo;
