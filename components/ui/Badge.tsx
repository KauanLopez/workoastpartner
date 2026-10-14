import React from 'react';
import { Icon } from './Icon';

export type BadgeTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'brand' | 'inverse' | 'outline';

const TONES: Record<BadgeTone, { bg: string; fg: string; dot: string; border?: string }> = {
  neutral: {
    bg: 'var(--status-neutral-bg)',
    fg: 'var(--status-neutral-fg)',
    dot: 'var(--status-neutral-dot)'
  },
  success: {
    bg: 'var(--status-success-bg)',
    fg: 'var(--status-success-fg)',
    dot: 'var(--status-success-dot)'
  },
  info: {
    bg: 'var(--status-info-bg)',
    fg: 'var(--status-info-fg)',
    dot: 'var(--status-info-dot)'
  },
  warning: {
    bg: 'var(--status-warning-bg)',
    fg: 'var(--status-warning-fg)',
    dot: 'var(--status-warning-dot)'
  },
  danger: {
    bg: 'var(--status-danger-bg)',
    fg: 'var(--status-danger-fg)',
    dot: 'var(--status-danger-dot)'
  },
  brand: {
    bg: 'var(--green-500)',
    fg: 'var(--neutral-950)',
    dot: 'var(--neutral-950)'
  },
  inverse: {
    bg: 'var(--surface-inverse)',
    fg: 'var(--text-inverse)',
    dot: 'var(--green-500)'
  },
  outline: {
    bg: 'transparent',
    fg: 'var(--text-secondary)',
    dot: 'var(--text-tertiary)',
    border: 'var(--border-default)'
  }
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  dot?: boolean;
  icon?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  size = 'md',
  dot = true,
  icon,
  children,
  style,
  className,
  ...rest
}) => {
  const t = TONES[tone] || TONES.neutral;
  const h = size === 'sm' ? 20 : 24;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: h,
        padding: size === 'sm' ? '0 8px' : '0 10px',
        borderRadius: 'var(--radius-pill)',
        background: t.bg,
        color: t.fg,
        border: t.border ? `1px solid ${t.border}` : 'none',
        fontFamily: 'var(--font-sans)',
        fontSize: size === 'sm' ? 11.5 : 12,
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...style
      }}
      {...rest}
    >
      {icon ? (
        <Icon name={icon} size={size === 'sm' ? 12 : 14} />
      ) : dot ? (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: t.dot,
            flexShrink: 0
          }}
        />
      ) : null}
      {children != null && <span>{children}</span>}
    </span>
  );
};

export default Badge;
