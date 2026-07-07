import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

// ─── Card ────────────────────────────────────────────────
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  breatheDelay?: number;
}> = ({ children, className = '', hover = true, onClick, breatheDelay = 0 }) => (
  <motion.div
    whileHover={hover ? { scale: 1.012 } : {}}
    whileTap={onClick ? { scale: 0.985 } : {}}
    transition={{ duration: 0.15, ease: 'easeOut' }}
    onClick={onClick}
    className={`p-4 rounded-lg overflow-hidden relative ${onClick ? 'cursor-pointer' : ''} ${className}`}
    style={{
      background: 'var(--bio-card)',
      border: '1px solid var(--bio-border)',
      animation: `breathe 3.2s ease-in-out ${breatheDelay}s infinite, float 4s ease-in-out ${breatheDelay * 0.5}s infinite`,
      boxShadow: '0 0 0 1px rgba(57,255,106,0.05), 0 4px 24px rgba(0,0,0,0.4)',
    }}
  >
    {children}
  </motion.div>
);

// ─── Badge ───────────────────────────────────────────────
export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'gold';
  className?: string;
}> = ({ children, variant = 'default', className = '' }) => {
  const styles: Record<string, React.CSSProperties> = {
    default: {
      background: 'rgba(57,255,106,0.06)',
      border: '1px solid rgba(57,255,106,0.15)',
      color: 'rgba(57,255,106,0.55)',
    },
    success: {
      background: 'rgba(57,255,106,0.10)',
      border: '1px solid rgba(57,255,106,0.30)',
      color: '#39ff6a',
    },
    danger: {
      background: 'rgba(224,82,82,0.10)',
      border: '1px solid rgba(224,82,82,0.30)',
      color: '#e05252',
    },
    warning: {
      background: 'rgba(57,255,106,0.10)',
      border: '1px solid rgba(57,255,106,0.30)',
      color: '#39ff6a',
    },
    gold: {
      background: 'rgba(57,255,106,0.10)',
      border: '1px solid rgba(57,255,106,0.30)',
      color: '#39ff6a',
    },
  };

  return (
    <span
      className={`text-[9px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded ${className}`}
      style={styles[variant]}
    >
      {children}
    </span>
  );
};

// ─── Button ──────────────────────────────────────────────
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
  disabled,
}) => {
  const base = 'flex items-center gap-2 px-3 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-widest transition-all duration-200';

  const getStyle = (): React.CSSProperties => {
    if (disabled) return {
      border: '1px solid rgba(57,255,106,0.1)',
      color: 'rgba(57,255,106,0.25)',
      background: 'transparent',
      cursor: 'not-allowed',
      opacity: 0.5,
    };
    if (variant === 'filled') return {
      background: 'var(--bio-green)',
      color: 'var(--bio-black)',
      fontWeight: 700,
      boxShadow: '0 0 16px rgba(57,255,106,0.2)',
    };
    if (variant === 'ghost') return {
      background: 'transparent',
      color: 'rgba(57,255,106,0.4)',
    };
    return {
      border: '1px solid var(--bio-border)',
      color: 'var(--bio-green)',
      background: 'transparent',
    };
  };

  return (
    <motion.button
      whileTap={!disabled ? { scale: 0.97 } : {}}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      transition={{ duration: 0.12 }}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${className}`}
      style={getStyle()}
      onMouseEnter={(e) => {
        if (!disabled && variant === 'outline') {
          (e.currentTarget as HTMLElement).style.background = 'var(--bio-green-dim)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(57,255,106,0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && variant === 'outline') {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--bio-border)';
        }
      }}
    >
      {Icon && <Icon size={13} />}
      {children}
    </motion.button>
  );
};

// ─── StatCard ────────────────────────────────────────────
const statCardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' as const },
  }),
};

export const StatCard: React.FC<{
  label: string;
  value: string | number;
  subtext: string;
  variant?: 'default' | 'gold' | 'danger';
  index?: number;
}> = ({ label, value, subtext, variant = 'default', index = 0 }) => {
  const borderColor =
    variant === 'gold'   ? 'rgba(57,255,106,0.6)'  :
    variant === 'danger' ? '#e05252'                 :
                           'rgba(57,255,106,0.13)';
  const valueColor =
    variant === 'gold'   ? '#39ff6a'  :
    variant === 'danger' ? '#e05252'  :
                           'var(--text-primary)';
  const valueAnim =
    variant === 'gold'   ? 'node-pulse 2.2s ease-in-out infinite' :
    variant === 'danger' ? 'node-pulse-purple 2.2s ease-in-out infinite' :
                           'none';

  return (
    <motion.div
      custom={index}
      variants={statCardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.015 }}
      transition={{ duration: 0.15 }}
      className="p-4 rounded-lg flex flex-col gap-1.5 relative overflow-hidden"
      style={{
        background: 'var(--bio-card)',
        border: '1px solid var(--bio-border)',
        borderTop: `2px solid ${borderColor}`,
        boxShadow: `0 0 20px rgba(57,255,106,0.04)`,
        animationDelay: `${index * 0.4}s`,
        animation: `breathe 3.2s ease-in-out ${index * 0.4}s infinite`,
      }}
    >
      {/* Morph blob decoration */}
      <div
        style={{
          position: 'absolute',
          width: 80, height: 80,
          bottom: -20, right: -20,
          background: variant === 'danger'
            ? 'radial-gradient(circle, rgba(224,82,82,0.05), transparent)'
            : 'radial-gradient(circle, rgba(57,255,106,0.05), transparent)',
          animation: `morph 9s ease-in-out ${index * 1.5}s infinite`,
          pointerEvents: 'none',
          borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%',
        }}
      />
      <span className="text-[9px] font-mono uppercase"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.18em' }}>
        {label}
      </span>
      <span
        className="text-3xl font-black font-display"
        style={{ color: valueColor, animation: valueAnim }}
      >
        {value}
      </span>
      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
        {subtext}
      </span>
    </motion.div>
  );
};

// ─── SkeletonBlock ───────────────────────────────────────
export const SkeletonBlock: React.FC<{
  className?: string;
  lines?: number;
}> = ({ className = '', lines = 3 }) => {
  const widths = ['w-3/4', 'w-full', 'w-5/6', 'w-2/3', 'w-4/5'];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`space-y-3 ${className}`}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 skeleton-shimmer ${widths[i % widths.length]}`}
        />
      ))}
    </motion.div>
  );
};

// ─── SectionHeader ───────────────────────────────────────
export const SectionHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <h3
    className={`font-display text-[10px] uppercase ${className}`}
    style={{ color: 'rgba(57,255,106,0.4)', letterSpacing: '0.2em' }}
  >
    {children}
  </h3>
);
