import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  isLoading = false,
  ...props
}) => {
  const baseClasses = 'flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform';
  
  const variantClasses = {
    primary: 'text-white bg-violet-600 hover:bg-violet-700 focus:ring-violet-500 shadow-lg shadow-violet-600/20 hover:shadow-violet-600/40 hover:-translate-y-0.5',
    secondary: 'text-slate-300 bg-slate-700 hover:bg-slate-600 focus:ring-slate-500',
    danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-lg shadow-red-600/20 hover:shadow-red-600/40 hover:-translate-y-0.5',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : children}
    </button>
  );
};