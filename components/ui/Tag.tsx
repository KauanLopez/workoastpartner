import React, { useState } from 'react';
import { Icon } from './Icon';

export interface TagProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  meta?: React.ReactNode;
  icon?: string;
  selected?: boolean;
  variant?: 'soft' | 'outline';
  size?: 'sm' | 'md';
  onRemove?: (e: React.MouseEvent | React.KeyboardEvent) => void;
  disabled?: boolean;
}

export const Tag: React.FC<TagProps> = ({
  children,
  meta,
  icon,
  selected = false,
  variant = 'soft',
  size = 'md',
  onClick,
  onRemove,
  disabled = false,
  style,
  ...rest
}) => {
  const [hover, setHover] = useState(false);
  const clickable = !!onClick && !disabled;
  const h = size === 'sm' ? 26 : 30;
  const outline = variant === 'outline';

  const bg = selected
    ? 'var(--surface-inverse)'
    : outline
    ? clickable && hover
      ? 'var(--surface-hover)'
      : 'var(--surface-card)'
    : clickable && hover
    ? 'var(--surface-pressed)'
    : 'var(--surface-sunken)';

  const border = selected
    ? 'var(--surface-inverse)'
    : outline
    ? 'var(--border-default)'
    : 'transparent';

  const fg = selected ? 'var(--text-inverse)' : 'var(--text-primary)';
  const dim = selected ? 'var(--neutral-300)' : 'var(--text-secondary)';
  const El = clickable ? 'button' : 'span';

  return (
    // @ts-ignore
    <El
      type={clickable ? 'button' : undefined}
      onClick={clickable ? onClick : undefined}
      aria-pressed={clickable ? selected : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: h,
        padding: onRemove ? '0 4px 0 11px' : '0 11px',
        borderRadius: 'var(--radius-pill)',
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        fontFamily: 'var(--font-mono)',
        fontSize: size === 'sm' ? 11.5 : 12,
        fontWeight: 500,
        lineHeight: 1,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        cursor: clickable ? 'pointer' : 'default',
        opacity: disabled ? 0.5 : 1,
        margin: 0,
        transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
        ...style
      }}
      {...rest}
    >
      {icon && (
        <Icon
          name={icon}
          size={13}
          color={selected ? 'var(--green-500)' : 'currentColor'}
        />
      )}
      {children != null && <span>{children}</span>}
      {meta && (
        <span style={{ color: dim, fontWeight: 400 }}>
          {meta}
        </span>
      )}
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Remove ${typeof children === 'string' ? children : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onRemove(e);
            }
          }}
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: dim
          }}
        >
          <Icon name="x" size={12} />
        </span>
      )}
    </El>
  );
};

export default Tag;
