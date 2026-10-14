import React, { useEffect } from 'react';
import { IconButton } from './IconButton';

const WIDTHS = {
  sm: 420,
  md: 540,
  lg: 720
};

export interface DialogProps {
  open?: boolean;
  onClose?: () => void;
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | number;
  dismissible?: boolean;
  inline?: boolean;
  style?: React.CSSProperties;
}

export const Dialog: React.FC<DialogProps> = ({
  open = false,
  onClose,
  eyebrow,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
  inline = false,
  style
}) => {
  useEffect(() => {
    if (!open || inline || !dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, inline, dismissible, onClose]);

  if (!open && !inline) return null;

  const maxWidth = typeof size === 'number' ? size : WIDTHS[size] || WIDTHS.md;

  const panel = (
    <div
      role="dialog"
      aria-modal={inline ? undefined : true}
      aria-label={typeof title === 'string' ? title : undefined}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%',
        maxWidth,
        maxHeight: inline ? undefined : 'calc(100vh - 48px)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-card)',
        color: 'var(--text-primary)',
        borderRadius: 'var(--radius-dialog)',
        border: 'none',
        boxShadow: 'var(--shadow-lg)',
        fontFamily: 'var(--font-sans)',
        overflow: 'hidden',
        animation: inline ? undefined : 'v-fade-up var(--dur-base) var(--ease-out)',
        ...style
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
          padding: '22px 24px 0'
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'grid',
            gap: 6,
            minWidth: 0
          }}
        >
          {eyebrow && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)'
              }}
            >
              {eyebrow}
            </div>
          )}
          {title && (
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                fontWeight: 400,
                lineHeight: 1.2,
                letterSpacing: '-0.02em'
              }}
            >
              {title}
            </div>
          )}
          {description && (
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: 'var(--text-secondary)',
                textWrap: 'pretty'
              }}
            >
              {description}
            </div>
          )}
        </div>
        {dismissible && (
          <IconButton
            icon="x"
            label="Close"
            size="sm"
            onClick={onClose}
            style={{ marginTop: -4, marginRight: -8 }}
          />
        )}
      </div>

      {children != null && (
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'grid',
            gap: 16
          }}
        >
          {children}
        </div>
      )}

      {footer && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '14px 24px',
            marginTop: children != null ? 0 : 20,
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--surface-card)'
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );

  if (inline) return panel;

  return (
    <div
      onClick={dismissible ? onClose : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--surface-overlay)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'v-fade var(--dur-base) var(--ease-out)'
      }}
    >
      {panel}
    </div>
  );
};

export default Dialog;
