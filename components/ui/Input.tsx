import React, { useId, useState } from 'react';
import { Icon } from './Icon';

const SIZES = {
  sm: { h: 'var(--control-sm)', fs: 13, px: 10 },
  md: { h: 'var(--control-md)', fs: 14, px: 12 },
  lg: { h: 'var(--control-lg)', fs: 15, px: 14 }
};

export interface FieldLabelProps {
  htmlFor?: string;
  children?: React.ReactNode;
  optional?: boolean;
}

export const FieldLabel: React.FC<FieldLabelProps> = ({ htmlFor, children, optional }) => {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 6,
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1.3,
        color: 'var(--text-primary)'
      }}
    >
      {children}
      {optional && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-tertiary)',
            letterSpacing: '0.02em'
          }}
        >
          optional
        </span>
      )}
    </label>
  );
};

export interface FieldHintProps {
  error?: boolean;
  children?: React.ReactNode;
  id?: string;
}

export const FieldHint: React.FC<FieldHintProps> = ({ error, children, id }) => {
  if (!children) return null;
  return (
    <div
      id={id}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        lineHeight: 1.4,
        color: error ? 'var(--status-danger-fg)' : 'var(--text-tertiary)'
      }}
    >
      {error && <Icon name="triangle-alert" size={14} />}
      {children}
    </div>
  );
};

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'size'> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | boolean;
  optional?: boolean;
  iconLeft?: string;
  suffix?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  multiline?: boolean;
  rows?: number;
  inputStyle?: React.CSSProperties;
}

export const Input: React.FC<InputProps> = ({
  label,
  hint,
  error,
  optional,
  iconLeft,
  suffix,
  size = 'md',
  multiline = false,
  rows = 3,
  id,
  disabled = false,
  style,
  inputStyle,
  onFocus,
  onBlur,
  ...rest
}) => {
  const autoId = useId();
  const fieldId = id || autoId;
  const [focus, setFocus] = useState(false);
  const [hover, setHover] = useState(false);

  const s = SIZES[size] || SIZES.md;
  const border = error
    ? 'var(--red-500)'
    : focus
    ? 'var(--border-focus)'
    : hover
    ? 'var(--border-strong)'
    : 'var(--border-default)';

  const ring = focus
    ? error
      ? 'var(--ring-danger)'
      : 'var(--ring-focus-soft)'
    : 'none';

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
          display: 'flex',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: 8,
          minHeight: multiline ? undefined : s.h,
          padding: multiline ? `10px ${s.px}px` : `0 ${s.px}px`,
          background: disabled ? 'var(--surface-sunken)' : 'var(--surface-card)',
          border: `1px solid ${border}`,
          borderRadius: 'var(--radius-control)',
          boxShadow: ring,
          opacity: disabled ? 0.6 : 1,
          transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)'
        }}
      >
        {iconLeft && (
          <span
            style={{
              color: 'var(--text-tertiary)',
              display: 'flex',
              paddingTop: multiline ? 2 : 0
            }}
          >
            <Icon name={iconLeft} size={16} />
          </span>
        )}

        {multiline ? (
          <textarea
            id={fieldId}
            disabled={disabled}
            rows={rows}
            aria-invalid={error ? true : undefined}
            aria-describedby={hint || error ? `${fieldId}-hint` : undefined}
            onFocus={(e) => {
              setFocus(true);
              onFocus?.(e as any);
            }}
            onBlur={(e) => {
              setFocus(false);
              onBlur?.(e as any);
            }}
            style={{
              flex: 1,
              minWidth: 0,
              border: 0,
              outline: 'none',
              background: 'transparent',
              padding: 0,
              margin: 0,
              fontFamily: 'var(--font-sans)',
              fontSize: s.fs,
              lineHeight: 1.5,
              color: 'var(--text-primary)',
              resize: 'vertical',
              ...inputStyle
            }}
            {...(rest as any)}
          />
        ) : (
          <input
            id={fieldId}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={hint || error ? `${fieldId}-hint` : undefined}
            onFocus={(e) => {
              setFocus(true);
              onFocus?.(e as any);
            }}
            onBlur={(e) => {
              setFocus(false);
              onBlur?.(e as any);
            }}
            style={{
              flex: 1,
              minWidth: 0,
              border: 0,
              outline: 'none',
              background: 'transparent',
              padding: 0,
              margin: 0,
              fontFamily: 'var(--font-sans)',
              fontSize: s.fs,
              lineHeight: 1.2,
              color: 'var(--text-primary)',
              height: '100%',
              ...inputStyle
            }}
            {...(rest as any)}
          />
        )}

        {suffix && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-tertiary)',
              whiteSpace: 'nowrap'
            }}
          >
            {suffix}
          </span>
        )}
      </div>

      <FieldHint id={`${fieldId}-hint`} error={!!error}>
        {typeof error === 'string' ? error : hint}
      </FieldHint>
    </div>
  );
};

export default Input;
