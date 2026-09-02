import React, { useState } from 'react';
import {
  Sparkles,
  Cpu,
  Zap,
  HardDrive,
  Trash2,
  Download,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Image as ImageIcon,
  Activity,
} from 'lucide-react';

import { useModels } from './hooks/useModels';
import { useBatchJob } from './hooks/useBatchJob';
import { Dropzone } from './components/Dropzone';
import { ControlPanel } from './components/ControlPanel';
import { ProgressBar } from './components/ProgressBar';
import { ImageGrid } from './components/ImageGrid';
import { CompareSlider } from './components/CompareSlider';

export default function App() {
  const { models, health, loading: modelsLoading, error: modelsError, triggerCleanup } = useModels();
  const {
    jobId,
    status,
    progress,
    items,
    warnings,
    error: jobError,
    startBatch,
    cancelBatch,
    exportZip,
    reset,
  } = useBatchJob();

  const [stagedFiles, setStagedFiles] = useState([]);
  const [config, setConfig] = useState({
    model: 'realesrgan-x4plus',
    scale: 4,
    tile_size: 128,
    threads: '1:2:2',
  });
  const [activeCompareItem, setActiveCompareItem] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  const isProcessing = ['UPLOADING', 'PROCESSING'].includes(status);
  const isFinished = ['COMPLETED', 'PARTIAL_FAILURE', 'FAILED', 'CANCELLED'].includes(status);

  const handleStartUpscaling = () => {
    if (stagedFiles.length === 0 || isProcessing) return;
    const rawFiles = stagedFiles.map((item) => item.file);
    startBatch(rawFiles, config);
  };

  const handleResetAll = () => {
    setStagedFiles([]);
    setSelectedItemIds([]);
    reset();
  };

  const downloadSelected = () => {
    const selectedItems = items.filter(
      (item) => selectedItemIds.includes(item.item_id) && item.preview_url
    );
    selectedItems.forEach((item, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = item.preview_url;
        link.download = item.upscaled_name || 'upscaled.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 200);
    });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header & Telemetry Bar */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(11, 15, 25, 0.85)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            padding: '0.85rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 0 25px rgba(37, 99, 235, 0.6)',
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    background: 'linear-gradient(90deg, #f0f6fc 0%, #60a5fa 50%, #38bdf8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  ScaleUp
                </h1>
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(37, 99, 235, 0.25)',
                    color: 'var(--blue-300)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                >
                  v1.1.0
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Local Hardware-Accelerated AI Image Upscaler (NCNN Vulkan)
              </p>
            </div>
          </div>

          {/* System Hardware & Memory Telemetry */}
          {health && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Zap size={14} color="var(--amber-400)" />
                <span>Vega 8 RADV</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Activity size={14} color="var(--emerald-400)" />
                <span>RAM: {health.process_memory_mb} MB</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <HardDrive size={14} color="var(--cyan-400)" />
                <span>Scratch: {health.storage_usage_mb} MB</span>
              </div>

              <button
                onClick={triggerCleanup}
                title="Purge Temporary Scratch Archives"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--rose-400)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <Trash2 size={13} />
                <span>Clean</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <main
        style={{
          flex: 1,
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        {/* Error Banner */}
        {(modelsError || jobError) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--rose-400)',
              fontSize: '0.9rem',
            }}
          >
            <AlertTriangle size={20} />
            <span>{modelsError || jobError}</span>
          </div>
        )}

        {/* Warnings Banner */}
        {warnings && warnings.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              padding: '0.9rem 1.2rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.25)',
              color: 'var(--amber-400)',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <AlertTriangle size={16} />
              <span>Batch Pre-Flight Notices:</span>
            </div>
            {warnings.map((w, idx) => (
              <p key={idx} style={{ marginLeft: '1.5rem', fontSize: '0.8rem' }}>
                • {w}
              </p>
            ))}
          </div>
        )}

        {/* Active Processing Progress Bar */}
        {isProcessing && (
          <ProgressBar progress={progress} status={status} onCancel={cancelBatch} />
        )}

        {/* Finished Status Banner */}
        {isFinished && (
          <div
            className="glass-panel glow-indigo"
            style={{
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor:
                    status === 'COMPLETED'
                      ? 'rgba(52, 211, 153, 0.2)'
                      : 'rgba(251, 191, 36, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: status === 'COMPLETED' ? 'var(--emerald-400)' : 'var(--amber-400)',
                }}
              >
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {status === 'COMPLETED' && 'Batch Upscaling Completed'}
                  {status === 'PARTIAL_FAILURE' && 'Batch Completed with Some Warnings'}
                  {status === 'CANCELLED' && 'Batch Cancelled by User'}
                  {status === 'FAILED' && 'Batch Processing Failed'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Processed {progress.total_items} items in {progress.elapsed_seconds} seconds.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                onClick={handleResetAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-raised)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={16} />
                <span>New Batch</span>
              </button>

              {items.some((i) => i.status === 'success') && (
                <button
                  onClick={exportZip}
                  className="glow-cyan"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1.2rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <Download size={16} />
                  <span>Download Batch (.ZIP)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* View 1: Staging Mode (Dropzone & Control Panel) */}
        {!isProcessing && !isFinished && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <Dropzone
              stagedFiles={stagedFiles}
              onFilesChange={setStagedFiles}
              disabled={isProcessing}
            />

            <ControlPanel
              models={models}
              health={health}
              config={config}
              onConfigChange={setConfig}
              stagedCount={stagedFiles.length}
              onStart={handleStartUpscaling}
              disabled={isProcessing}
            />
          </div>
        )}

        {/* View 2: Live Processing & Gallery View */}
        {(isProcessing || isFinished) && items.length > 0 && (
          <ImageGrid
            items={items}
            onCompare={setActiveCompareItem}
            selectedIds={selectedItemIds}
            onSelectionChange={setSelectedItemIds}
          />
        )}
      </main>

      {/* Floating Selection Action Bar */}
      {selectedItemIds.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--cyan-400)',
            borderRadius: '30px',
            padding: '0.6rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
            zIndex: 500,
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {selectedItemIds.length} item{selectedItemIds.length > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={downloadSelected}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              backgroundColor: 'var(--cyan-500)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Download size={14} />
            <span>Download Selected</span>
          </button>
          <button
            onClick={() => setSelectedItemIds([])}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            Deselect
          </button>
        </div>
      )}

      {/* Interactive Before/After Split Comparison Modal */}
      {activeCompareItem && (
        <CompareSlider
          item={activeCompareItem}
          onClose={() => setActiveCompareItem(null)}
        />
      )}
    </div>
  );
}
