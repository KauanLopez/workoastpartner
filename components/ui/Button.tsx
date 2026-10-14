import React, { useState } from 'react';
import { Icon } from './Icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  iconLeft?: string;
  iconRight?: string;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const SIZES = {
  sm: { h: 'var(--control-sm)', px: 12, fs: 13, gap: 6, icon: 16 },
  md: { h: 'var(--control-md)', px: 16, fs: 14, gap: 8, icon: 18 },
  lg: { h: 'var(--control-lg)', px: 20, fs: 15, gap: 8, icon: 20 }
};

const VARIANTS = {
  primary: {
    bg: 'var(--surface-inverse)',
    hover: 'var(--surface-inverse-hover)',
    fg: 'var(--text-inverse)',
    border: 'transparent'
  },
  brand: {
    bg: 'var(--surface-brand)',
    hover: 'var(--surface-brand-hover)',
    fg: 'var(--text-on-brand)',
    border: 'transparent'
  },
  secondary: {
    bg: 'var(--surface-card)',
    hover: 'var(--surface-hover)',
    fg: 'var(--text-primary)',
    border: 'var(--border-default)'
  },
  ghost: {
    bg: 'transparent',
    hover: 'var(--surface-hover)',
    fg: 'var(--text-primary)',
    border: 'transparent'
  },
  danger: {
    bg: 'var(--red-700)',
    hover: 'var(--red-800)',
    fg: '#FFFFFF',
    border: 'transparent'
  }
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  children,
  style,
  onClick,
  ...rest
}) => {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const [focus, setFocus] = useState(false);

  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const inert = disabled || loading;

  return (
    <button
      type={type}
      disabled={inert}
      onClick={onClick}
      aria-busy={loading || undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPress(false);
      }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      onFocus={(e) => setFocus(e.target.matches(':focus-visible'))}
      onBlur={() => setFocus(false)}
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        height: s.h,
        padding: `0 ${s.px}px`,
        fontFamily: 'var(--font-sans)',
        fontSize: s.fs,
        fontWeight: 500,
        lineHeight: 1,
        letterSpacing: '-0.005em',
        whiteSpace: 'nowrap',
        color: v.fg,
        background: hover && !inert ? v.hover : v.bg,
        border: `1px solid ${v.border}`,
        borderRadius: 'var(--radius-button)',
        cursor: inert ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transform: press && !inert ? 'scale(0.98)' : 'none',
        boxShadow: focus ? 'var(--ring-focus)' : 'none',
        outline: 'none',
        transition: 'background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
        ...style
      }}
      {...rest}
    >
      {loading ? (
        <Icon
          name="loader-circle"
          size={s.icon}
          style={{ animation: 'v-spin 0.9s linear infinite' }}
        />
      ) : iconLeft ? (
        <Icon name={iconLeft} size={s.icon} />
      ) : null}
      {children != null && <span>{children}</span>}
      {iconRight && !loading ? (
        <Icon name={iconRight} size={s.icon} />
      ) : null}
    </button>
  );
};

export default Button;
