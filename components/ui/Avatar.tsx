import React, { useState } from 'react';

const SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80
};

const PALETTE = [
  { bg: 'var(--green-100)', fg: 'var(--green-800)' },
  { bg: 'var(--neutral-150)', fg: 'var(--neutral-800)' },
  { bg: 'var(--blue-100)', fg: 'var(--blue-700)' },
  { bg: 'var(--amber-100)', fg: 'var(--amber-700)' },
  { bg: 'var(--neutral-950)', fg: 'var(--green-500)' }
];

function initials(name = ''): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    ((parts[0] || '')[0] || '') +
    (parts.length > 1 ? parts[parts.length - 1][0] : '')
  ).toUpperCase();
}

function hash(s = ''): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  status?: 'online' | 'busy' | 'away';
  ring?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name = '',
  src,
  size = 'md',
  status,
  ring = false,
  style,
  ...rest
}) => {
  const px = typeof size === 'number' ? size : SIZES[size] || SIZES.md;
  const c = PALETTE[hash(name) % PALETTE.length];
  const [failed, setFailed] = useState(false);
  const dot = Math.max(8, Math.round(px * 0.26));

  return (
    <span
      title={name || undefined}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexShrink: 0,
        width: px,
        height: px,
        borderRadius: '50%',
        background: c.bg,
        color: c.fg,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: ring ? '0 0 0 2px var(--surface-card)' : 'none',
        fontFamily: 'var(--font-sans)',
        fontSize: Math.round(px * 0.38),
        fontWeight: 600,
        letterSpacing: '-0.01em',
        ...style
      }}
      {...rest}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
      {status && (
        <span
          aria-label={status}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: dot,
            height: dot,
            borderRadius: '50%',
            background:
              status === 'online'
                ? 'var(--green-500)'
                : status === 'busy'
                ? 'var(--red-500)'
                : 'var(--amber-500)',
            border: '2px solid var(--surface-card)',
            boxSizing: 'border-box'
          }}
        />
      )}
    </span>
  );
};

export interface AvatarGroupProps {
  people: { name: string; src?: string }[];
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  style?: React.CSSProperties;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  people = [],
  max = 4,
  size = 'sm',
  style
}) => {
  const px = typeof size === 'number' ? size : SIZES[size] || SIZES.sm;
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        ...style
      }}
    >
      {shown.map((p, i) => (
        <Avatar
          key={i}
          name={p.name}
          src={p.src}
          size={size}
          ring
          style={{
            marginLeft: i === 0 ? 0 : -Math.round(px * 0.28)
          }}
        />
      ))}
      {extra > 0 && (
        <span
          style={{
            marginLeft: -Math.round(px * 0.28),
            width: px,
            height: px,
            borderRadius: '50%',
            background: 'var(--surface-sunken)',
            color: 'var(--text-secondary)',
            boxShadow: '0 0 0 2px var(--surface-card)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: Math.round(px * 0.34),
            fontWeight: 500
          }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
};

export default Avatar;
