import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export const Card: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  hover?: boolean;
  onClick?: () => void;
}> = ({ 
  children, 
  className = '', 
  hover = true,
  onClick 
}) => (
  <motion.div 
    whileHover={hover ? { y: -2 } : {}}
    onClick={onClick}
    className={`bg-bg-2 border border-border p-4 rounded-sm transition-colors duration-200 ${className}`}
  >
    {children}
  </motion.div>
);

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'default' | 'success' | 'danger' | 'warning' | 'gold'; className?: string }> = ({ 
  children, 
  variant = 'default', 
  className = '' 
}) => {
  const variants = {
    default: 'bg-bg-4 border-border text-text-secondary',
    success: 'bg-accent-success/10 border-accent-success/20 text-accent-success',
    danger: 'bg-accent-danger/10 border-accent-danger/20 text-accent-danger',
    warning: 'bg-accent-warning/10 border-accent-warning/20 text-accent-warning',
    gold: 'bg-gold/10 border-gold/20 text-gold',
  };

  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'outline' | 'filled' | 'ghost';
  className?: string;
  icon?: LucideIcon;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'outline', 
  className = '', 
  icon: Icon,
  disabled 
}) => {
  const variants = {
    outline: 'border border-border hover:border-gold hover:bg-gold-dim text-text-secondary hover:text-gold',
    filled: 'bg-gold text-bg-0 font-bold hover:bg-gold/90',
    ghost: 'hover:bg-bg-3 text-text-muted hover:text-text-primary',
  };

  return (
    <motion.button
      whileTap={!disabled ? { scale: 0.97 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-[11px] transition-all duration-200 ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {Icon && <Icon size={14} />}
      {children}
    </motion.button>
  );
};

export const StatCard: React.FC<{ label: string; value: string | number; subtext: string; variant?: 'default' | 'gold' | 'danger' }> = ({ 
  label, 
  value, 
  subtext, 
  variant = 'default' 
}) => {
  const accentColor = variant === 'gold' ? 'border-b-gold' : variant === 'danger' ? 'border-b-accent-danger' : 'border-b-border';
  
  return (
    <Card className={`border-b-2 ${accentColor} flex flex-col gap-1`}>
      <span className="text-[10px] text-text-secondary uppercase font-display">{label}</span>
      <span className="text-2xl font-black font-display text-text-primary">{value}</span>
      <span className="text-[10px] text-text-muted font-mono">{subtext}</span>
    </Card>
  );
};
