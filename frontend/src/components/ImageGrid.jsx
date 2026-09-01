import React, { useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Split,
  Eye,
  Loader2,
  XCircle,
  FileCheck,
} from 'lucide-react';

export function ImageGrid({ items, onCompare, selectedIds, onSelectionChange }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'success' | 'failed'

  const filteredItems = items.filter((item) => {
    if (filter === 'success') return item.status === 'success';
    if (filter === 'failed')
      return ['failed', 'skipped_invalid', 'cancelled'].includes(item.status);
    return true;
  });

  const toggleSelect = (itemId) => {
    if (selectedIds.includes(itemId)) {
      onSelectionChange(selectedIds.filter((id) => id !== itemId));
    } else {
      onSelectionChange([...selectedIds, itemId]);
    }
  };

  const getStatusBadge = (status, errorMsg) => {
    switch (status) {
      case 'success':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'rgba(52, 211, 153, 0.15)',
              color: 'var(--emerald-400)',
              fontSize: '0.72rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <CheckCircle size={12} />
            Success
          </span>
        );
      case 'processing':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: 'var(--cyan-400)',
              fontSize: '0.72rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Loader2 size={12} className="animate-spin-slow" />
            Upscaling
          </span>
        );
      case 'queued':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'rgba(148, 163, 184, 0.12)',
              color: 'var(--text-muted)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Clock size={12} />
            Queued
          </span>
        );
      case 'skipped_invalid':
        return (
          <span
            title={errorMsg || 'Invalid or Corrupt File'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'rgba(251, 191, 36, 0.15)',
              color: 'var(--amber-400)',
              fontSize: '0.72rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              cursor: 'help',
            }}
          >
            <AlertCircle size={12} />
            Skipped
          </span>
        );
      case 'failed':
        return (
          <span
            title={errorMsg || 'Inference Error'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              color: 'var(--rose-400)',
              fontSize: '0.72rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              cursor: 'help',
            }}
          >
            <AlertCircle size={12} />
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'rgba(100, 116, 139, 0.15)',
              color: 'var(--text-muted)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <XCircle size={12} />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const successCount = items.filter((i) => i.status === 'success').length;
  const failCount = items.filter((i) => ['failed', 'skipped_invalid'].includes(i.status)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Filter Tabs Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: filter === 'all' ? 'var(--cyan-500)' : 'var(--bg-surface-raised)',
              color: filter === 'all' ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            All Items ({items.length})
          </button>
          <button
            onClick={() => setFilter('success')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: filter === 'success' ? 'rgba(52, 211, 153, 0.2)' : 'var(--bg-surface-raised)',
              color: filter === 'success' ? 'var(--emerald-400)' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Completed ({successCount})
          </button>
          {failCount > 0 && (
            <button
              onClick={() => setFilter('failed')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: filter === 'failed' ? 'rgba(244, 63, 94, 0.2)' : 'var(--bg-surface-raised)',
                color: filter === 'failed' ? 'var(--rose-400)' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Errors / Skipped ({failCount})
            </button>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {filteredItems.map((item) => {
          const isSelected = selectedIds.includes(item.item_id);
          const hasOutput = item.status === 'success' && item.preview_url;

          return (
            <div
              key={item.item_id}
              className="glass-panel glass-panel-hover"
              style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: isSelected ? '1.5px solid var(--cyan-400)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Thumbnail Container */}
              <div
                className="checkerboard-bg"
                style={{
                  height: '180px',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {hasOutput ? (
                  <img
                    src={item.preview_url}
                    alt={item.upscaled_name || item.original_name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      transition: 'transform 0.3s ease',
                    }}
                  />
                ) : item.original_url ? (
                  <img
                    src={item.original_url}
                    alt={item.original_name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      opacity: item.status === 'skipped_invalid' ? 0.35 : 0.7,
                    }}
                  />
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>No Preview</div>
                )}

                {/* Status Badge overlay */}
                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  {getStatusBadge(item.status, item.error_message)}
                </div>

                {/* Selection Checkbox */}
                {hasOutput && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(item.item_id)}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: 'var(--cyan-400)',
                    }}
                  />
                )}
              </div>

              {/* Card Meta & Actions */}
              <div
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  flex: 1,
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <div>
                  <h4
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={item.original_name}
                  >
                    {item.original_name}
                  </h4>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '0.35rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span>
                      {item.input_width && item.input_height
                        ? `${item.input_width}×${item.input_height}`
                        : '---'}{' '}
                      →{' '}
                      {item.output_width && item.output_height
                        ? `${item.output_width}×${item.output_height}`
                        : '---'}
                    </span>
                    {item.duration_seconds && (
                      <span style={{ color: 'var(--cyan-400)' }}>{item.duration_seconds}s</span>
                    )}
                  </div>

                  {item.error_message && (
                    <p
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--rose-400)',
                        marginTop: '0.4rem',
                        lineHeight: '1.3',
                      }}
                    >
                      {item.error_message}
                    </p>
                  )}
                </div>

                {/* Actions Footer */}
                {hasOutput && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      onClick={() => onCompare(item)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        color: 'var(--cyan-400)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.2)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.1)')
                      }
                    >
                      <Split size={14} />
                      <span>Compare</span>
                    </button>

                    <a
                      href={item.preview_url}
                      download={item.upscaled_name || 'upscaled.png'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-surface-raised)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      }}
                    >
                      <Download size={14} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
