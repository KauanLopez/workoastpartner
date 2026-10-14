import React from 'react';
import { Icon } from './Icon';

export type ToastTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger';

const TONES: Record<ToastTone, { icon: string; bg: string; fg: string }> = {
  neutral: {
    icon: 'info',
    bg: 'var(--status-neutral-bg)',
    fg: 'var(--status-neutral-fg)'
  },
  success: {
    icon: 'circle-check',
    bg: 'var(--status-success-bg)',
    fg: 'var(--status-success-fg)'
  },
  info: {
    icon: 'info',
    bg: 'var(--status-info-bg)',
    fg: 'var(--status-info-fg)'
  },
  warning: {
    icon: 'triangle-alert',
    bg: 'var(--status-warning-bg)',
    fg: 'var(--status-warning-fg)'
  },
  danger: {
    icon: 'circle-x',
    bg: 'var(--status-danger-bg)',
    fg: 'var(--status-danger-fg)'
  }
};

export interface ToastProps {
  id?: string;
  tone?: ToastTone;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: string;
  action?: { label: string; onClick: () => void };
  onClose?: () => void;
  style?: React.CSSProperties;
}

export const Toast: React.FC<ToastProps> = ({
  tone = 'neutral',
  title,
  description,
  icon,
  action,
  onClose,
  style
}) => {
  const t = TONES[tone] || TONES.neutral;

  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        width: '100%',
        maxWidth: 400,
        padding: 14,
        background: 'var(--surface-raised)',
        color: 'var(--text-primary)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-subtle)',
        fontFamily: 'var(--font-sans)',
        animation: 'v-fade-up var(--dur-base) var(--ease-out)',
        ...style
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: '50%',
          background: t.bg,
          color: t.fg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Icon name={icon || t.icon} size={16} />
      </span>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'grid',
          gap: 3,
          paddingTop: 4
        }}
      >
        {title && (
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.35
            }}
          >
            {title}
          </div>
        )}
        {description && (
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.45,
              color: 'var(--text-secondary)',
              textWrap: 'pretty'
            }}
          >
            {description}
          </div>
        )}
      </div>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            flexShrink: 0,
            marginTop: 4,
            border: 0,
            background: 'transparent',
            padding: '0 4px',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'underline',
            textUnderlineOffset: 3
          }}
        >
          {action.label}
        </button>
      )}

      {onClose && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onClose}
          style={{
            flexShrink: 0,
            marginTop: 2,
            width: 24,
            height: 24,
            border: 0,
            borderRadius: 'var(--radius-pill)',
            background: 'transparent',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0
          }}
        >
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
};

export default Toast;
