import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'indigo' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-neutral-100 text-neutral-700 border-neutral-200/80',
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
    error: 'bg-rose-50 text-rose-700 border-rose-200/80',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] font-medium tracking-tight rounded-md border',
    md: 'px-2.5 py-1 text-xs font-medium tracking-tight rounded-lg border',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
