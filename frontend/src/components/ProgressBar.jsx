import React from 'react';
import { Loader2, StopCircle, Clock, CheckCircle2, AlertOctagon } from 'lucide-react';

export function ProgressBar({ progress, status, onCancel }) {
  const formatTime = (seconds) => {
    if (seconds == null || isNaN(seconds)) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isCancelling = status === 'CANCELLED';
  const percentage = Math.min(100, Math.max(0, progress.percentage || 0));

  return (
    <div
      className="glass-panel glow-cyan"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan-400)',
            }}
          >
            <Loader2 size={20} className="animate-spin-slow" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                {status === 'UPLOADING' ? 'Uploading Batch Payload...' : 'Batch Upscaling in Progress'}
              </h3>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(56, 189, 248, 0.2)',
                  color: 'var(--cyan-400)',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {percentage.toFixed(1)}%
              </span>
            </div>
            {progress.current_file && (
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '2px',
                }}
              >
                Active: <span style={{ color: 'var(--cyan-400)' }}>{progress.current_file}</span>
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={isCancelling}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.9rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            color: 'var(--rose-400)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: isCancelling ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(244, 63, 94, 0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(244, 63, 94, 0.1)')}
        >
          <StopCircle size={16} />
          <span>{isCancelling ? 'Aborting...' : 'Cancel Batch'}</span>
        </button>
      </div>

      {/* Progress Bar Container */}
      <div
        style={{
          width: '100%',
          height: '10px',
          borderRadius: '6px',
          backgroundColor: 'var(--bg-surface-raised)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          className="progress-gradient"
          style={{
            width: `${percentage}%`,
            height: '100%',
            borderRadius: '6px',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>

      {/* Telemetry Metrics Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          fontSize: '0.8rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <CheckCircle2 size={14} color="var(--cyan-400)" />
          <span>
            Processed {progress.current_index} of {progress.total_items} items
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={14} />
            <span>Elapsed: {formatTime(progress.elapsed_seconds)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={14} color="var(--amber-400)" />
            <span>ETA: {formatTime(progress.eta_seconds)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
