import React, { useRef, useState } from 'react';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { Button } from './Button';

function formatBytes(n?: number): string {
  if (n == null) return '';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return Math.round(n / 1024) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

export interface FileDropProps {
  title?: string;
  hint?: string;
  accept?: string;
  file?: { name: string; size?: number } | null;
  progress?: number;
  status?: string;
  error?: string;
  onFile?: (file: File) => void;
  onRemove?: () => void;
  disabled?: boolean;
  compact?: boolean;
  style?: React.CSSProperties;
}

export const FileDrop: React.FC<FileDropProps> = ({
  title = 'Drop your resume here',
  hint = 'PDF or DOCX · up to 10 MB',
  accept = '.pdf,.doc,.docx',
  file,
  progress,
  status,
  error,
  onFile,
  onRemove,
  disabled = false,
  compact = false,
  style
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const pick = (f?: File) => {
    if (f && onFile) onFile(f);
  };

  if (file) {
    const uploading = progress != null && progress < 100;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          background: 'var(--surface-card)',
          border: `1px solid ${error ? 'var(--red-500)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-lg)',
          fontFamily: 'var(--font-sans)',
          ...style
        }}
      >
        <span
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-sunken)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)'
          }}
        >
          <Icon name="file-text" size={20} />
        </span>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'grid',
            gap: 4
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {file.name}
          </div>
          {uploading ? (
            <div
              style={{
                height: 4,
                borderRadius: 'var(--radius-pill)',
                background: 'var(--neutral-150)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'var(--surface-inverse)',
                  transition: 'width var(--dur-slow) var(--ease-out)'
                }}
              />
            </div>
          ) : (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: error ? 'var(--status-danger-fg)' : 'var(--text-tertiary)'
              }}
            >
              {error || [formatBytes(file.size), status].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        {onRemove && (
          <IconButton
            icon="x"
            label="Remove file"
            size="sm"
            onClick={onRemove}
          />
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!disabled) pick(e.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      style={{
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 14 : 12,
        textAlign: compact ? 'left' : 'center',
        padding: compact ? '16px 18px' : '28px 24px',
        fontFamily: 'var(--font-sans)',
        background: drag ? 'var(--surface-brand-soft)' : 'var(--surface-card)',
        border: `1.5px dashed ${
          error ? 'var(--red-500)' : drag ? 'var(--green-700)' : 'var(--border-strong)'
        }`,
        borderRadius: 'var(--radius-lg)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
        ...style
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <span
        style={{
          width: 44,
          height: 44,
          flexShrink: 0,
          borderRadius: 'var(--radius-md)',
          background: drag ? 'var(--green-500)' : 'var(--surface-sunken)',
          color: 'var(--neutral-950)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background var(--dur-fast) var(--ease-out)'
        }}
      >
        <Icon name="cloud-upload" size={22} />
      </span>
      <div style={{ display: 'grid', gap: 3 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
          {title}
        </div>
        <div className="v-caption">{hint}</div>
      </div>
      {compact && <div style={{ flex: 1 }} />}
      {compact && (
        <Button size="sm" variant="secondary" iconLeft="upload" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
          Browse
        </Button>
      )}
    </div>
  );
};

export default FileDrop;
