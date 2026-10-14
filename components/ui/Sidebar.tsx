import React, { useState } from 'react';
import { Icon } from './Icon';

export interface SidebarItem {
  value: string;
  label: string;
  icon?: string;
  count?: number | string;
  disabled?: boolean;
}

interface NavItemProps {
  item: SidebarItem;
  active: boolean;
  onSelect: (value: string) => void;
}

const NavItem: React.FC<NavItemProps> = ({ item, active, onSelect }) => {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const lit = hover && !active && !item.disabled;

  return (
    <button
      type="button"
      disabled={item.disabled}
      aria-current={active ? 'page' : undefined}
      onClick={() => onSelect(item.value)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={(e) => setFocus(e.target.matches(':focus-visible'))}
      onBlur={() => setFocus(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        height: 38,
        padding: '0 8px 0 12px',
        margin: 0,
        border: 0,
        borderRadius: 'var(--radius-md)',
        cursor: item.disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        outline: 'none',
        background: active
          ? 'var(--surface-brand)'
          : lit
          ? 'var(--surface-hover)'
          : 'transparent',
        color: active
          ? 'var(--text-on-brand)'
          : lit
          ? 'var(--text-primary)'
          : 'var(--text-secondary)',
        boxShadow: focus ? 'var(--ring-focus)' : 'none',
        opacity: item.disabled ? 0.45 : 1,
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)'
      }}
    >
      {item.icon && <Icon name={item.icon} size={18} />}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {item.label}
      </span>
      {item.count != null && (
        <span
          style={{
            minWidth: 22,
            height: 20,
            padding: '0 6px',
            borderRadius: 'var(--radius-pill)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: active ? 'var(--neutral-950)' : 'var(--surface-pressed)',
            color: active ? 'var(--green-500)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 500
          }}
        >
          {item.count}
        </span>
      )}
    </button>
  );
};

export interface SidebarProps {
  items?: SidebarItem[];
  bottomItems?: SidebarItem[];
  value?: string;
  onChange?: (value: string) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  width?: string | number;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items = [],
  bottomItems = [],
  value,
  onChange,
  header,
  footer,
  width = 'var(--sidebar-width)',
  label = 'Main',
  className,
  style
}) => {
  const select = (v: string) => {
    onChange?.(v);
  };

  return (
    <nav
      aria-label={label}
      className={className}
      style={{
        width,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: '24px 16px 20px',
        boxSizing: 'border-box',
        fontFamily: 'var(--font-sans)',
        background: 'var(--bg-app)',
        borderRight: '1px solid var(--border-subtle)',
        ...style
      }}
    >
      {header && (
        <div
          style={{
            padding: '6px 12px 2px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {header}
        </div>
      )}

      <div style={{ display: 'grid', gap: 2 }}>
        {items.map((it) => (
          <NavItem
            key={it.value}
            item={it}
            active={it.value === value}
            onSelect={select}
          />
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {bottomItems.length > 0 && (
        <div style={{ display: 'grid', gap: 2 }}>
          {bottomItems.map((it) => (
            <NavItem
              key={it.value}
              item={it}
              active={it.value === value}
              onSelect={select}
            />
          ))}
        </div>
      )}

      {footer && (
        <div
          style={{
            paddingTop: 16,
            borderTop: '1px solid var(--border-subtle)'
          }}
        >
          {footer}
        </div>
      )}
    </nav>
  );
};

export default Sidebar;
