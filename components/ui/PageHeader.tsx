import React from 'react';

export interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  actions,
  style
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap',
        marginBottom: 28,
        ...style
      }}
    >
      <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
        {eyebrow && (
          <span
            className="v-label"
            style={{
              color: 'var(--text-tertiary)',
              letterSpacing: '0.08em'
            }}
          >
            {eyebrow}
          </span>
        )}
        <h1
          className="v-h2"
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 400,
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)'
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="v-body v-muted"
            style={{
              margin: 0,
              maxWidth: 680,
              fontSize: 15,
              lineHeight: 1.5,
              color: 'var(--text-secondary)'
            }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
