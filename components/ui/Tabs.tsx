import React, { useState } from 'react';
import { Icon } from './Icon';

export interface TabItem {
  value: string;
  label: React.ReactNode;
  icon?: string;
  count?: number | string;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  variant?: 'underline' | 'segmented';
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

interface TabButtonProps {
  item: TabItem;
  active: boolean;
  variant: 'underline' | 'segmented';
  size: 'sm' | 'md';
  onSelect: (value: string) => void;
}

const TabButton: React.FC<TabButtonProps> = ({
  item,
  active,
  variant,
  size,
  onSelect
}) => {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);

  const seg = variant === 'segmented';
  const h = seg ? (size === 'sm' ? 28 : 34) : size === 'sm' ? 36 : 44;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={item.disabled}
      onClick={() => onSelect(item.value)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={(e) => setFocus(e.target.matches(':focus-visible'))}
      onBlur={() => setFocus(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: h,
        padding: seg ? '0 12px' : '0 2px',
        margin: 0,
        border: 0,
        cursor: item.disabled ? 'not-allowed' : 'pointer',
        background: seg
          ? active
            ? 'var(--surface-card)'
            : 'transparent'
          : 'transparent',
        borderRadius: seg ? 'var(--radius-pill)' : 0,
        boxShadow:
          seg && active
            ? 'var(--shadow-xs)'
            : focus
            ? 'var(--ring-focus)'
            : 'none',
        color: active || hover ? 'var(--text-primary)' : 'var(--text-secondary)',
        opacity: item.disabled ? 0.45 : 1,
        outline: 'none',
        fontFamily: 'var(--font-sans)',
        fontSize: size === 'sm' ? 13 : 14,
        fontWeight: active ? 600 : 500,
        whiteSpace: 'nowrap',
        transition: 'color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)'
      }}
    >
      {item.icon && <Icon name={item.icon} size={16} />}
      {item.label}
      {item.count != null && (
        <span
          style={{
            minWidth: 20,
            height: 18,
            padding: '0 6px',
            borderRadius: 'var(--radius-pill)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              active && !seg
                ? 'var(--surface-inverse)'
                : 'var(--surface-sunken)',
            color: active && !seg ? 'var(--green-500)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 500
          }}
        >
          {item.count}
        </span>
      )}
      {!seg && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 2,
            borderRadius: 2,
            background: active ? 'var(--text-primary)' : 'transparent',
            transition: 'background var(--dur-fast) var(--ease-out)'
          }}
        />
      )}
    </button>
  );
};

export const Tabs: React.FC<TabsProps> = ({
  items = [],
  value,
  defaultValue,
  onChange,
  variant = 'underline',
  size = 'md',
  style
}) => {
  const isControlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? (items[0] && items[0].value));
  const current = isControlled ? value : inner;

  const select = (v: string) => {
    if (!isControlled) setInner(v);
    onChange?.(v);
  };

  const seg = variant === 'segmented';

  return (
    <div
      role="tablist"
      style={{
        display: seg ? 'inline-flex' : 'flex',
        alignItems: 'center',
        gap: seg ? 2 : 24,
        maxWidth: '100%',
        overflowX: 'auto',
        padding: seg ? 3 : 0,
        background: seg ? 'var(--surface-sunken)' : 'transparent',
        borderRadius: seg ? 'var(--radius-pill)' : 0,
        borderBottom: 'none',
        boxShadow: seg ? 'none' : 'inset 0 -1px 0 var(--border-subtle)',
        ...style
      }}
    >
      {items.map((it) => (
        <TabButton
          key={it.value}
          item={it}
          active={it.value === current}
          variant={variant}
          size={size}
          onSelect={select}
        />
      ))}
    </div>
  );
};

export default Tabs;
