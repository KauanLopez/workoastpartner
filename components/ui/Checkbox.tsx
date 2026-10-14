import React, { useId, useState } from 'react';
import { Icon } from './Icon';

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean, e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  defaultChecked = false,
  indeterminate = false,
  onChange,
  label,
  description,
  disabled = false,
  id,
  style
}) => {
  const autoId = useId();
  const fieldId = id || autoId;
  const isControlled = checked !== undefined;
  const [inner, setInner] = useState(defaultChecked);
  const on = isControlled ? checked : inner;
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const filled = on || indeterminate;

  return (
    <label
      htmlFor={fieldId}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-start',
        gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'var(--font-sans)',
        ...style
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'flex',
          flexShrink: 0,
          marginTop: label ? 1 : 0
        }}
      >
        <input
          id={fieldId}
          type="checkbox"
          checked={on}
          disabled={disabled}
          onChange={(e) => {
            if (!isControlled) setInner(e.target.checked);
            onChange?.(e.target.checked, e);
          }}
          onFocus={(e) => setFocus(e.target.matches(':focus-visible'))}
          onBlur={() => setFocus(false)}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            margin: 0,
            cursor: 'inherit'
          }}
        />
        <span
          aria-hidden="true"
          style={{
            width: 18,
            height: 18,
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: filled ? 'var(--surface-inverse)' : 'var(--surface-card)',
            border: `1.5px solid ${
              filled
                ? 'var(--surface-inverse)'
                : hover
                ? 'var(--text-primary)'
                : 'var(--border-strong)'
            }`,
            boxShadow: focus ? 'var(--ring-focus)' : 'none',
            transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)'
          }}
        >
          {indeterminate ? (
            <Icon name="minus" size={13} color="var(--green-500)" />
          ) : on ? (
            <Icon name="check" size={13} color="var(--green-500)" />
          ) : null}
        </span>
      </span>

      {(label || description) && (
        <span style={{ display: 'grid', gap: 2 }}>
          {label && (
            <span
              style={{
                fontSize: 14,
                lineHeight: 1.4,
                color: 'var(--text-primary)'
              }}
            >
              {label}
            </span>
          )}
          {description && (
            <span
              style={{
                fontSize: 13,
                lineHeight: 1.4,
                color: 'var(--text-tertiary)'
              }}
            >
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
};

export default Checkbox;
