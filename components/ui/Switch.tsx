import React, { useId } from 'react';

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  defaultChecked = false,
  onChange,
  label,
  disabled = false,
  size = 'md',
  style
}) => {
  const autoId = useId();
  const [inner, setInner] = React.useState(defaultChecked);
  const on = checked !== undefined ? checked : inner;
  const isSm = size === 'sm';

  const w = isSm ? 34 : 44;
  const h = isSm ? 20 : 24;
  const dot = isSm ? 14 : 18;
  const travel = w - dot - 6;

  const toggle = () => {
    if (disabled) return;
    if (checked === undefined) setInner(!on);
    onChange?.(!on);
  };

  return (
    <label
      htmlFor={autoId}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'var(--font-sans)',
        ...style
      }}
    >
      <input
        id={autoId}
        type="checkbox"
        checked={on}
        disabled={disabled}
        onChange={toggle}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'relative',
          display: 'inline-block',
          width: w,
          height: h,
          borderRadius: 'var(--radius-pill)',
          background: on ? 'var(--green-500)' : 'var(--neutral-200)',
          transition: 'background var(--dur-fast) var(--ease-out)',
          flexShrink: 0
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: (h - dot) / 2,
            left: 3,
            width: dot,
            height: dot,
            borderRadius: '50%',
            background: on ? 'var(--neutral-950)' : '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            transform: on ? `translateX(${travel}px)` : 'none',
            transition: 'transform var(--dur-fast) var(--ease-out)'
          }}
        />
      </span>
      {label && (
        <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
          {label}
        </span>
      )}
    </label>
  );
};

export default Switch;
