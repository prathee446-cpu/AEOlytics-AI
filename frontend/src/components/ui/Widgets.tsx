import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CARD COMPONENT ---
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: 'indigo' | 'violet' | 'success' | 'none';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glow = 'none',
  hoverable = false,
  ...props
}) => {
  const glowClass = 
    glow === 'indigo' ? 'glow-indigo' :
    glow === 'violet' ? 'glow-violet' :
    glow === 'success' ? 'glow-success' : '';
    
  return (
    <div
      className={`glass rounded-xl p-5 border border-border/60 transition-all duration-300 ${glowClass} ${
        hoverable ? 'hover:scale-[1.01] hover:border-accent/30 hover:bg-cardHover/40 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// --- BUTTON COMPONENT ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  loading = false,
  size = 'md',
  disabled,
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
  
  const variantStyles = {
    primary: 'bg-accent text-zinc-50 hover:bg-accent-hover shadow-lg shadow-accent/15',
    secondary: 'bg-neutral-800/80 text-white hover:text-white hover:bg-neutral-700 border border-border/60',
    danger: 'bg-danger text-zinc-50 hover:bg-red-600 shadow-lg shadow-danger/10',
    ghost: 'text-muted hover:text-white hover:bg-neutral-800/40',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
};

// --- INPUT COMPONENT ---
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label ? (
          <label className="text-xs font-medium text-muted tracking-wider uppercase font-display">{label}</label>
        ) : null}
        <input
          type={type}
          ref={ref}
          className={`w-full text-sm rounded-lg border px-3 py-2.5 outline-none transition-all focus:ring-1 focus:ring-accent/30 focus:border-accent/60 ${
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''
          } ${className}`}
          style={{
            backgroundColor: 'var(--input-bg)',
            borderColor: error ? '' : 'var(--input-border)',
            color: 'var(--input-text)',
          }}
          {...props}
        />
        {error ? <span className="text-xs text-danger font-medium mt-0.5">{error}</span> : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

// --- SELECT COMPONENT ---
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, options, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label ? (
          <label className="text-xs font-medium text-muted tracking-wider uppercase font-display">{label}</label>
        ) : null}
        <select
          ref={ref}
          className={`w-full text-sm rounded-lg border px-3 py-2.5 outline-none transition-all focus:border-accent/60 cursor-pointer ${
            error ? 'border-danger focus:border-danger' : ''
          } ${className}`}
          style={{
            backgroundColor: 'var(--input-bg)',
            borderColor: error ? '' : 'var(--input-border)',
            color: 'var(--input-text)',
          }}
          {...props}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              style={{ backgroundColor: 'var(--card)', color: 'var(--text-white)' }}
            >
              {opt.label}
            </option>
          ))}
        </select>
        {error ? <span className="text-xs text-danger font-medium mt-0.5">{error}</span> : null}
      </div>
    );
  }
);
Select.displayName = 'Select';

// --- BADGE COMPONENT ---
export interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '' }) => {
  const styles = {
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
    info: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    neutral: 'border border-border text-muted',
  };
  const neutralStyle = variant === 'neutral' ? { backgroundColor: 'var(--card-hover)' } : {};

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]} ${className}`}
      style={neutralStyle}
    >
      {children}
    </span>
  );
};

// --- SKELETON COMPONENT ---
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`animate-pulse rounded bg-neutral-800/60 ${className}`} />;
};

// --- DIALOG COMPONENT ---
export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />
          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg glass rounded-xl border border-border/80 p-6 overflow-hidden z-10 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-border/60 mb-4">
              <h3 className="text-lg font-semibold font-display text-white">{title}</h3>
              <button
                onClick={onClose}
                className="text-muted hover:text-white transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};
