import React from 'react';
import { Cpu, Zap, Layers, Sparkles, Sliders, ShieldCheck, Activity } from 'lucide-react';

const TILE_OPTIONS = [
  { value: 128, label: '128px (Recommended for Vega 8)', desc: 'Optimal stability & vibrant output on AMD RADV' },
  { value: 64, label: '64px (Ultra-Safe)', desc: 'Lowest shader buffer footprint; ideal for Real-ESRNet' },
  { value: 256, label: '256px (Fast Anime)', desc: 'Fastest for lightweight anime/video models' },
  { value: 0, label: 'Auto (0px)', desc: 'Auto-tiled per model architecture' },
];

const THREAD_PRESETS = [
  { value: '1:1:1', label: '1:1:1 (Minimal RAM)', desc: 'Lowest memory consumption (<300MB)' },
  { value: '1:2:2', label: '1:2:2 (Default Balanced)', desc: 'Ideal CPU/GPU balance for Ryzen 7730U' },
  { value: '2:4:4', label: '2:4:4 (Max Throughput)', desc: 'Multi-threaded I/O utilizing 8C/16T' },
];

export function ControlPanel({
  models,
  health,
  config,
  onConfigChange,
  stagedCount,
  onStart,
  disabled,
}) {
  const selectedModel = models.find((m) => m.id === config.model) || models[0];

  const handleModelChange = (modelId) => {
    const newModel = models.find((m) => m.id === modelId);
    if (!newModel) return;

    let newScale = config.scale;
    if (!newModel.scales.includes(newScale)) {
      newScale = newModel.default_scale;
    }

    onConfigChange({
      ...config,
      model: modelId,
      scale: newScale,
    });
  };

  const getModelBadgeColor = (type) => {
    switch (type) {
      case 'photo': return 'rgba(56, 189, 248, 0.15)';
      case 'denoise': return 'rgba(99, 102, 241, 0.15)';
      case 'anime': return 'rgba(236, 72, 153, 0.15)';
      case 'fast': return 'rgba(52, 211, 153, 0.15)';
      default: return 'rgba(148, 163, 184, 0.15)';
    }
  };

  const getModelBadgeTextColor = (type) => {
    switch (type) {
      case 'photo': return 'var(--cyan-400)';
      case 'denoise': return 'var(--indigo-500)';
      case 'anime': return '#f472b6';
      case 'fast': return 'var(--emerald-400)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Sliders size={20} color="var(--cyan-400)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Inference Configuration</h2>
        </div>

        {health && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              padding: '0.3rem 0.6rem',
              borderRadius: '20px',
              backgroundColor: 'rgba(52, 211, 153, 0.1)',
              color: 'var(--emerald-400)',
              border: '1px solid rgba(52, 211, 153, 0.25)',
            }}
          >
            <Activity size={13} />
            <span>RADV Vulkan Active</span>
          </div>
        )}
      </div>

      {/* Model Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          AI Upscaling Model
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {models.map((m) => {
            const isSelected = config.model === m.id;
            return (
              <div
                key={m.id}
                onClick={() => !disabled && handleModelChange(m.id)}
                style={{
                  padding: '0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected
                    ? '1.5px solid var(--cyan-400)'
                    : '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-surface)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {m.name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: getModelBadgeColor(m.type),
                      color: getModelBadgeTextColor(m.type),
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {m.type}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  {m.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scale Multiplier & Tiling Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        {/* Scale Multiplier */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Scale Multiplier
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[2, 3, 4].map((scaleFactor) => {
              const isSupported = selectedModel?.scales?.includes(scaleFactor);
              const isSelected = config.scale === scaleFactor;
              return (
                <button
                  key={scaleFactor}
                  type="button"
                  disabled={disabled || !isSupported}
                  onClick={() => onConfigChange({ ...config, scale: scaleFactor })}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: isSelected
                      ? '1px solid var(--cyan-400)'
                      : '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: isSelected
                      ? 'rgba(56, 189, 248, 0.15)'
                      : isSupported
                      ? 'var(--bg-surface)'
                      : 'rgba(255,255,255,0.02)',
                    color: isSelected
                      ? 'var(--cyan-400)'
                      : isSupported
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: disabled || !isSupported ? 'not-allowed' : 'pointer',
                    opacity: isSupported ? 1 : 0.4,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {scaleFactor}x
                </button>
              );
            })}
          </div>
        </div>

        {/* Tiling Size */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            VRAM Tiling Size
          </label>
          <select
            value={config.tile_size}
            disabled={disabled}
            onChange={(e) => onConfigChange({ ...config, tile_size: parseInt(e.target.value) })}
            style={{
              padding: '0.65rem 0.8rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {TILE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ backgroundColor: 'var(--bg-surface)' }}>
                {opt.label} — {opt.desc}
              </option>
            ))}
          </select>
        </div>

        {/* Concurrency Threads */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Thread Concurrency (-j)
          </label>
          <select
            value={config.threads || '1:2:2'}
            disabled={disabled}
            onChange={(e) => onConfigChange({ ...config, threads: e.target.value })}
            style={{
              padding: '0.65rem 0.8rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {THREAD_PRESETS.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ backgroundColor: 'var(--bg-surface)' }}>
                {opt.label} — {opt.desc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hardware Telemetry Specs Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255,255,255,0.05)',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={15} color="var(--cyan-400)" />
          <span>AMD Ryzen 7 7730U (8C/16T)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={15} color="var(--amber-400)" />
          <span>AMD Radeon Vega 8 (RADV) • GPU 0</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={15} color="var(--emerald-400)" />
          <span>Process RSS: {health ? `${health.process_memory_mb} MB` : '42 MB'} / 2048 MB Limit</span>
        </div>
      </div>

      {/* Action CTA Button */}
      <button
        type="button"
        disabled={disabled || stagedCount === 0}
        onClick={onStart}
        className="glow-cyan"
        style={{
          padding: '0.95rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          border: 'none',
          background: stagedCount > 0 && !disabled
            ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #1d4ed8 100%)'
            : 'var(--bg-surface-raised)',
          color: stagedCount > 0 && !disabled ? '#ffffff' : 'var(--text-muted)',
          fontWeight: 700,
          fontSize: '1rem',
          cursor: disabled || stagedCount === 0 ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          transition: 'all 0.2s ease',
          boxShadow: stagedCount > 0 && !disabled ? '0 4px 25px rgba(37, 99, 235, 0.45)' : 'none',
        }}
      >
        <Sparkles size={18} />
        <span>
          {stagedCount === 0
            ? 'Stage Images Above to Begin'
            : `Upscale ${stagedCount} Image${stagedCount > 1 ? 's' : ''} (${config.scale}x)`}
        </span>
      </button>
    </div>
  );
}
