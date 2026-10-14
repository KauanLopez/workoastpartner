import React, { useState } from 'react';

const PADDING: Record<string, number> = {
  none: 0,
  sm: 16,
  md: 24,
  lg: 32
};

const RADIUS: Record<string, string> = {
  card: 'var(--radius-card)',
  nested: 'var(--radius-nested)',
  md: 'var(--radius-md)'
};

const VARIANTS: Record<string, { bg: string; border: string; fg: string }> = {
  default: {
    bg: 'var(--surface-card)',
    border: 'transparent',
    fg: 'var(--text-primary)'
  },
  outline: {
    bg: 'var(--surface-card)',
    border: 'var(--border-subtle)',
    fg: 'var(--text-primary)'
  },
  sunken: {
    bg: 'var(--surface-sunken)',
    border: 'transparent',
    fg: 'var(--text-primary)'
  },
  inverse: {
    bg: 'var(--surface-inverse)',
    border: 'transparent',
    fg: 'var(--text-inverse)'
  },
  brand: {
    bg: 'var(--surface-brand)',
    border: 'transparent',
    fg: 'var(--text-on-brand)'
  },
  soft: {
    bg: 'var(--surface-brand-soft)',
    border: 'transparent',
    fg: 'var(--text-primary)'
  }
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'sunken' | 'inverse' | 'brand' | 'soft';
  padding?: 'none' | 'sm' | 'md' | 'lg' | number;
  radius?: 'card' | 'nested' | 'md' | string;
  interactive?: boolean;
  selected?: boolean;
  as?: React.ElementType;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  radius,
  interactive = false,
  selected = false,
  as: Component = 'div',
  children,
  style,
  onClick,
  ...rest
}) => {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const v = VARIANTS[variant] || VARIANTS.default;
  const lift = interactive && hover;
  const outline = variant === 'outline';
  const r = RADIUS[radius || (outline ? 'nested' : 'card')] || radius || 'var(--radius-card)';

  const padVal = typeof padding === 'number' ? padding : (PADDING[padding] ?? 24);

  return (
    <Component
      onClick={onClick}
      role={interactive ? (rest.role ?? 'button') : rest.role}
      tabIndex={interactive ? (rest.tabIndex ?? 0) : rest.tabIndex}
      onMouseEnter={interactive ? () => setHover(true) : undefined}
      onMouseLeave={interactive ? () => setHover(false) : undefined}
      onFocus={(e: React.FocusEvent<HTMLElement>) => {
        if (interactive && e.target === e.currentTarget && e.target.matches?.(':focus-visible')) {
          setFocus(true);
        }
        rest.onFocus?.(e as any);
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        setFocus(false);
        rest.onBlur?.(e as any);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (interactive && onClick && (e.key === 'Enter' || e.key === ' ')) {
          if (e.target === e.currentTarget) {
            if (e.key === ' ') e.preventDefault();
            onClick(e as any);
          }
        }
        rest.onKeyDown?.(e as any);
      }}
      style={{
        position: 'relative',
        display: 'block',
        minWidth: 0,
        background: v.bg,
        color: v.fg,
        border: `1px solid ${outline && lift ? 'var(--border-strong)' : v.border}`,
        boxShadow: focus
          ? 'var(--ring-focus)'
          : selected
          ? 'inset 0 0 0 1.5px var(--border-inverse)'
          : lift && !outline
          ? 'var(--shadow-sm)'
          : 'none',
        borderRadius: r,
        padding: padVal,
        cursor: interactive ? 'pointer' : undefined,
        outline: 'none',
        textAlign: 'left',
        fontFamily: 'var(--font-sans)',
        transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
        ...style
      }}
      {...rest}
    >
      {children}
    </Component>
  );
};

export interface CardHeaderProps {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  eyebrow,
  title,
  description,
  action,
  style
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 18,
        ...style
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: 6,
          minWidth: 0
        }}
      >
        {eyebrow && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              opacity: 0.8
            }}
          >
            {eyebrow}
          </div>
        )}
        {title && (
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-title)',
              fontWeight: 400,
              lineHeight: 'var(--leading-title)',
              letterSpacing: 'var(--tracking-title)',
              color: 'var(--text-primary)'
            }}
          >
            {title}
          </div>
        )}
        {description && (
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.45,
              color: 'var(--text-secondary)',
              textWrap: 'pretty'
            }}
          >
            {description}
          </div>
        )}
      </div>
      {action && (
        <div
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {action}
        </div>
      )}
    </div>
  );
};

export default Card;
