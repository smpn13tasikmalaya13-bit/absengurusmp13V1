import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700 shadow-xl rounded-xl overflow-hidden ${className}`}>
      {title && (
        <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-700">
          <h3 className="text-base md:text-lg leading-6 font-semibold text-slate-100">{title}</h3>
        </div>
      )}
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
};