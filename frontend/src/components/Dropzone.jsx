import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';

const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp'];
const MAX_SINGLE_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_BATCH_SIZE = 500 * 1024 * 1024; // 500 MB

export function Dropzone({ stagedFiles, onFilesChange, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState(null);
  const fileInputRef = useRef(null);

  const inspectImageDimensions = (file) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(null);
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const dim = { width: img.naturalWidth, height: img.naturalHeight };
        URL.revokeObjectURL(url);
        resolve(dim);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  };

  const processFiles = async (rawFiles) => {
    setDragError(null);
    const newStaged = [...stagedFiles];
    let totalSize = stagedFiles.reduce((acc, item) => acc + item.file.size, 0);

    for (const file of rawFiles) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        setDragError(`Unsupported format "${ext}". Allowed: ${SUPPORTED_EXTENSIONS.join(', ')}`);
        continue;
      }

      if (file.size === 0) {
        setDragError(`Skipped empty 0-byte file: ${file.name}`);
        continue;
      }

      if (file.size > MAX_SINGLE_FILE_SIZE) {
        setDragError(`File "${file.name}" exceeds 50 MB limit.`);
        continue;
      }

      if (totalSize + file.size > MAX_BATCH_SIZE) {
        setDragError('Total batch payload exceeds 500 MB limit.');
        break;
      }

      // Check if already in staged
      const exists = newStaged.some(
        (item) => item.file.name === file.name && item.file.size === file.size
      );
      if (exists) continue;

      const previewUrl = URL.createObjectURL(file);
      const dimensions = await inspectImageDimensions(file);
      const is4K = dimensions && dimensions.width * dimensions.height > 3840 * 2160;

      newStaged.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
        dimensions,
        is4K,
      });

      totalSize += file.size;
    }

    onFilesChange(newStaged);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const removeFile = (idToRemove) => {
    const item = stagedFiles.find((i) => i.id === idToRemove);
    if (item && item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    onFilesChange(stagedFiles.filter((i) => i.id !== idToRemove));
  };

  const clearAll = () => {
    stagedFiles.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    onFilesChange([]);
    setDragError(null);
  };

  const totalBytes = stagedFiles.reduce((acc, item) => acc + item.file.size, 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Drop Target Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className="glass-panel"
        style={{
          border: isDragging ? '2px dashed var(--cyan-400)' : '2px dashed rgba(255,255,255,0.12)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          backgroundColor: isDragging ? 'rgba(56, 189, 248, 0.06)' : 'var(--bg-card)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.webp,.bmp,image/png,image/jpeg,image/webp,image/bmp"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(99,102,241,0.2) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(56,189,248,0.3)',
              color: 'var(--cyan-400)',
            }}
          >
            <Upload size={28} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Drag & drop batch images here
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              or <span style={{ color: 'var(--cyan-400)', textDecoration: 'underline' }}>browse from your system</span>
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginTop: '0.5rem',
            }}
          >
            {SUPPORTED_EXTENSIONS.map((ext) => (
              <span
                key={ext}
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-raised)',
                  color: 'var(--text-secondary)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {ext}
              </span>
            ))}
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(56,189,248,0.1)',
                color: 'var(--cyan-400)',
                border: '1px solid rgba(56,189,248,0.2)',
              }}
            >
              Max 50MB / img • 500MB batch
            </span>
          </div>
        </div>
      </div>

      {dragError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: 'var(--rose-400)',
            fontSize: '0.875rem',
          }}
        >
          <AlertTriangle size={18} />
          <span>{dragError}</span>
        </div>
      )}

      {/* Staged Images Header & Summary */}
      {stagedFiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 0.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Staged Images ({stagedFiles.length})
              </span>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}
              >
                • {totalMb} MB total
              </span>
            </div>

            {!disabled && (
              <button
                onClick={clearAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--rose-400)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Staged Items Horizontal / Grid Scroll */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.75rem',
              maxHeight: '320px',
              overflowY: 'auto',
              padding: '0.25rem',
            }}
          >
            {stagedFiles.map((item) => (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundColor: 'var(--bg-surface-raised)',
                  }}
                >
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={item.file.name}
                  >
                    {item.file.name}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span>{(item.file.size / (1024 * 1024)).toFixed(2)}MB</span>
                    {item.dimensions && (
                      <span>• {item.dimensions.width}×{item.dimensions.height}</span>
                    )}
                  </div>

                  {item.is4K && (
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.65rem',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        backgroundColor: 'rgba(251, 191, 36, 0.15)',
                        color: 'var(--amber-400)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        marginTop: '2px',
                      }}
                    >
                      &gt;4K (Auto-tiled)
                    </span>
                  )}
                </div>

                {!disabled && (
                  <button
                    onClick={() => removeFile(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--rose-400)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
