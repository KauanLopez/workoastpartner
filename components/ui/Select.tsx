import React, { useId, useState } from 'react';
import { Icon } from './Icon';
import { FieldLabel, FieldHint } from './Input';

const SIZES = {
  sm: { h: 'var(--control-sm)', fs: 13, px: 10 },
  md: { h: 'var(--control-md)', fs: 14, px: 12 },
  lg: { h: 'var(--control-lg)', fs: 15, px: 14 }
};

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | boolean;
  optional?: boolean;
  options?: (string | SelectOption)[];
  placeholder?: string;
  iconLeft?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Select: React.FC<SelectProps> = ({
  label,
  hint,
  error,
  optional,
  options = [],
  placeholder,
  iconLeft,
  size = 'md',
  id,
  disabled = false,
  value,
  defaultValue,
  onChange,
  style,
  ...rest
}) => {
  const autoId = useId();
  const fieldId = id || autoId;
  const [focus, setFocus] = useState(false);
  const [hover, setHover] = useState(false);

  const s = SIZES[size] || SIZES.md;
  const opts: SelectOption[] = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  const border = error
    ? 'var(--red-500)'
    : focus
    ? 'var(--border-focus)'
    : hover
    ? 'var(--border-strong)'
    : 'var(--border-default)';

  const isControlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? '');
  const current = isControlled ? value : inner;

  return (
    <div
      style={{
        display: 'grid',
        gap: 6,
        minWidth: 0,
        alignContent: 'start',
        ...style
      }}
    >
      {label && (
        <FieldLabel htmlFor={fieldId} optional={optional}>
          {label}
        </FieldLabel>
      )}
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          height: s.h,
          background: disabled ? 'var(--surface-sunken)' : 'var(--surface-card)',
          border: `1px solid ${border}`,
          borderRadius: 'var(--radius-control)',
          boxShadow: focus
            ? error
              ? 'var(--ring-danger)'
              : 'var(--ring-focus-soft)'
            : 'none',
          opacity: disabled ? 0.6 : 1,
          transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)'
        }}
      >
        {iconLeft && (
          <span
            style={{
              position: 'absolute',
              left: s.px,
              color: 'var(--text-tertiary)',
              display: 'flex',
              pointerEvents: 'none'
            }}
          >
            <Icon name={iconLeft} size={16} />
          </span>
        )}
        <select
          id={fieldId}
          disabled={disabled}
          value={current}
          onChange={(e) => {
            if (!isControlled) setInner(e.target.value);
            onChange?.(e);
          }}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          aria-invalid={error ? true : undefined}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            width: '100%',
            height: '100%',
            border: 0,
            outline: 'none',
            background: 'transparent',
            padding: `0 ${s.px + 24}px 0 ${iconLeft ? s.px + 24 : s.px}px`,
            margin: 0,
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)',
            fontSize: s.fs,
            color: current === '' ? 'var(--text-tertiary)' : 'var(--text-primary)'
          }}
          {...rest}
        >
          {placeholder != null && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {opts.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          style={{
            position: 'absolute',
            right: s.px - 2,
            color: 'var(--text-secondary)',
            display: 'flex',
            pointerEvents: 'none'
          }}
        >
          <Icon name="chevron-down" size={16} />
        </span>
      </div>
      <FieldHint error={!!error}>{typeof error === 'string' ? error : hint}</FieldHint>
    </div>
  );
};

export default Select;
