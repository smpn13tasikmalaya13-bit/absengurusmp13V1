
import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-slate-700 shadow-lg rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-600 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-100">{title}</h3>
        </div>
      )}
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
};