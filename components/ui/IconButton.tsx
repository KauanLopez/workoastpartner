import React, { useState } from 'react';
import { Icon } from './Icon';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  variant?: 'ghost' | 'secondary' | 'primary' | 'brand';
  size?: 'sm' | 'md' | 'lg';
  badge?: React.ReactNode;
  active?: boolean;
}

const SIZES = {
  sm: { box: 32, icon: 16 },
  md: { box: 40, icon: 18 },
  lg: { box: 48, icon: 20 }
};

const VARIANTS = {
  ghost: {
    bg: 'transparent',
    hover: 'var(--surface-hover)',
    fg: 'var(--text-secondary)',
    fgHover: 'var(--text-primary)',
    border: 'transparent'
  },
  secondary: {
    bg: 'var(--surface-card)',
    hover: 'var(--surface-hover)',
    fg: 'var(--text-primary)',
    fgHover: 'var(--text-primary)',
    border: 'var(--border-default)'
  },
  primary: {
    bg: 'var(--surface-inverse)',
    hover: 'var(--surface-inverse-hover)',
    fg: 'var(--text-inverse)',
    fgHover: 'var(--text-inverse)',
    border: 'transparent'
  },
  brand: {
    bg: 'var(--surface-brand)',
    hover: 'var(--surface-brand-hover)',
    fg: 'var(--text-on-brand)',
    fgHover: 'var(--text-on-brand)',
    border: 'transparent'
  }
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  badge,
  active = false,
  disabled = false,
  onClick,
  style,
  ...rest
}) => {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const [focus, setFocus] = useState(false);

  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.ghost;
  const lit = (hover || active) && !disabled;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active || undefined}
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
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: s.box,
        height: s.box,
        padding: 0,
        flex: 'none',
        borderRadius: 'var(--radius-button)',
        background: lit ? v.hover : v.bg,
        color: lit ? v.fgHover : v.fg,
        border: `1px solid ${v.border}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transform: press && !disabled ? 'scale(0.96)' : 'none',
        boxShadow: focus ? 'var(--ring-focus)' : 'none',
        outline: 'none',
        transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
        ...style
      }}
      {...rest}
    >
      <Icon name={icon} size={s.icon} />
      {badge != null && badge !== false && (
        <span
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 18,
            height: 18,
            padding: '0 4px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--green-500)',
            color: 'var(--neutral-950)',
            border: '2px solid var(--bg-app)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 600,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box'
          }}
        >
          {badge === true ? '' : badge}
        </span>
      )}
    </button>
  );
};

export default IconButton;
