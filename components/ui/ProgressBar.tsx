import React from 'react';

const TONES: Record<string, string> = {
  brand: 'var(--green-500)',
  ink: 'var(--surface-inverse)',
  success: 'var(--green-600)',
  info: 'var(--blue-500)',
  warning: 'var(--amber-500)',
  danger: 'var(--red-500)'
};

const HEIGHTS = {
  sm: 4,
  md: 6,
  lg: 8
};

export interface ProgressBarProps {
  value?: number;
  max?: number;
  label?: React.ReactNode;
  showValue?: boolean;
  valueLabel?: React.ReactNode;
  tone?: 'brand' | 'ink' | 'success' | 'info' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  segments?: number;
  style?: React.CSSProperties;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value = 0,
  max = 100,
  label,
  showValue = false,
  valueLabel,
  tone = 'brand',
  size = 'md',
  segments,
  style
}) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const h = HEIGHTS[size] || HEIGHTS.md;
  const fill = TONES[tone] || TONES.brand;
  const track = 'var(--neutral-150)';

  return (
    <div
      style={{
        display: 'grid',
        gap: 8,
        minWidth: 0,
        fontFamily: 'var(--font-sans)',
        ...style
      }}
    >
      {(label || showValue) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          {label && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)'
              }}
            >
              {label}
            </span>
          )}
          {showValue && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {valueLabel ?? `${Math.round(pct)}%`}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={typeof label === 'string' ? label : undefined}
        style={{
          display: 'flex',
          gap: segments ? 3 : 0,
          height: h
        }}
      >
        {segments ? (
          Array.from({ length: segments }).map((_, i) => {
            const segPct = Math.max(0, Math.min(1, (pct / 100) * segments - i));
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: '100%',
                  borderRadius: 'var(--radius-pill)',
                  background: track,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${segPct * 100}%`,
                    height: '100%',
                    background: fill,
                    transition: 'width var(--dur-slow) var(--ease-out)'
                  }}
                />
              </div>
            );
          })
        ) : (
          <div
            style={{
              flex: 1,
              height: '100%',
              borderRadius: 'var(--radius-pill)',
              background: track,
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 'var(--radius-pill)',
                background: fill,
                transition: 'width var(--dur-slow) var(--ease-out)'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
