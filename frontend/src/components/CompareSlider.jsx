import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Columns,
  Split,
  Eye,
  Info,
  Move,
} from 'lucide-react';

export function CompareSlider({ item, onClose }) {
  const [sliderPos, setSliderPos] = useState(50); // percentage (0 to 100)
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState('slider'); // 'slider' | 'side-by-side' | 'toggle'
  const [holdOriginal, setHoldOriginal] = useState(false);

  const containerRef = useRef(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setSliderPos((p) => Math.max(0, p - 5));
      if (e.key === 'ArrowRight') setSliderPos((p) => Math.min(100, p + 5));
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(4, z + 0.5));
      if (e.key === '-') setZoom((z) => Math.max(1, z - 0.5));
      if (e.key === ' ') {
        e.preventDefault();
        setHoldOriginal(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === ' ') setHoldOriginal(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onClose]);

  // Pointer drag for slider
  const handleSliderMove = useCallback(
    (clientX) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(pct);
    },
    []
  );

  const handlePointerDown = (e) => {
    if (e.target.closest('.slider-handle') || viewMode === 'slider') {
      setIsDragging(true);
      handleSliderMove(e.clientX);
    }
  };

  const handlePointerMove = (e) => {
    if (isDragging) {
      handleSliderMove(e.clientX);
    } else if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setIsPanning(false);
  };

  const handlePanStart = (e) => {
    if (e.button === 0 && !e.target.closest('.slider-handle') && zoom > 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const resetZoomPan = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 15, 0.92)',
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Top Navbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {item.original_name}
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: 'var(--cyan-400)',
            }}
          >
            <span>
              {item.input_width && item.input_height
                ? `${item.input_width}×${item.input_height}`
                : 'Original'}{' '}
              →{' '}
              {item.output_width && item.output_height
                ? `${item.output_width}×${item.output_height}`
                : 'Upscaled'}
            </span>
            {item.duration_seconds && <span>({item.duration_seconds}s)</span>}
          </div>
        </div>

        {/* Controls Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* View Modes */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-surface-raised)',
              borderRadius: '6px',
              padding: '2px',
            }}
          >
            <button
              onClick={() => setViewMode('slider')}
              title="Split Slider Mode"
              style={{
                background: viewMode === 'slider' ? 'var(--cyan-500)' : 'none',
                color: viewMode === 'slider' ? '#fff' : 'var(--text-muted)',
                border: 'none',
                padding: '5px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Split size={16} />
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              title="Side by Side Mode"
              style={{
                background: viewMode === 'side-by-side' ? 'var(--cyan-500)' : 'none',
                color: viewMode === 'side-by-side' ? '#fff' : 'var(--text-muted)',
                border: 'none',
                padding: '5px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Columns size={16} />
            </button>
          </div>

          {/* Zoom Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface-raised)',
              borderRadius: '6px',
              padding: '2px',
              gap: '2px',
            }}
          >
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                padding: '5px 8px',
                cursor: 'pointer',
              }}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                minWidth: '40px',
                textAlign: 'center',
              }}
            >
              {zoom}x
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                padding: '5px 8px',
                cursor: 'pointer',
              }}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            {zoom > 1 && (
              <button
                onClick={resetZoomPan}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--cyan-400)',
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Download Button */}
          <a
            href={item.preview_url}
            download={item.upscaled_name || 'upscaled.png'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              backgroundColor: 'var(--cyan-500)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'opacity 0.2s ease',
            }}
          >
            <Download size={15} />
            <span>Download</span>
          </a>

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Comparison Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handlePanStart}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
        }}
      >
        {viewMode === 'slider' && (
          <div
            style={{
              position: 'relative',
              width: '90%',
              height: '85%',
              maxWidth: '1400px',
              maxHeight: '850px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Checkerboard Background */}
            <div className="checkerboard-bg" style={{ position: 'absolute', inset: 0 }} />

            {/* Transformed Image Container (Zoom & Pan) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              {/* Layer 1: Upscaled Image (Right / Bottom layer) */}
              <img
                src={item.preview_url}
                alt="Upscaled"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  imageRendering: 'auto',
                }}
              />

              {/* Layer 2: Original Image (Left / Cropped layer) */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${holdOriginal ? 100 : sliderPos}%`,
                  overflow: 'hidden',
                  borderRight: holdOriginal ? 'none' : '2px solid var(--cyan-400)',
                  boxShadow: '2px 0 10px rgba(0,0,0,0.5)',
                }}
              >
                <img
                  src={item.original_url}
                  alt="Original"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: containerRef.current
                      ? `${containerRef.current.querySelector('.checkerboard-bg')?.clientWidth || 1000}px`
                      : '1000px',
                    height: '100%',
                    objectFit: 'contain',
                    imageRendering: 'pixelated',
                  }}
                />
              </div>
            </div>

            {/* Draggable Divider Handle Line */}
            {!holdOriginal && (
              <div
                className="slider-handle"
                onMouseDown={handlePointerDown}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${sliderPos}%`,
                  transform: 'translateX(-50%)',
                  width: '40px',
                  cursor: 'ew-resize',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 20,
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--cyan-400)',
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 15px rgba(56, 189, 248, 0.8)',
                    fontWeight: 800,
                    fontSize: '12px',
                  }}
                >
                  ↔
                </div>
              </div>
            )}

            {/* Floating Labels */}
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                zIndex: 10,
              }}
            >
              Original ({item.input_width}×{item.input_height})
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                backdropFilter: 'blur(8px)',
                color: 'var(--cyan-400)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                zIndex: 10,
              }}
            >
              Upscaled ({item.output_width}×{item.output_height})
            </div>
          </div>
        )}

        {viewMode === 'side-by-side' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              width: '94%',
              height: '85%',
              maxWidth: '1600px',
            }}
          >
            {/* Original Card */}
            <div
              className="glass-panel"
              style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '0.6rem 1rem',
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                Original ({item.input_width}×{item.input_height})
              </div>
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }} className="checkerboard-bg">
                <img
                  src={item.original_url}
                  alt="Original"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  }}
                />
              </div>
            </div>

            {/* Upscaled Card */}
            <div
              className="glass-panel"
              style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '0.6rem 1rem',
                  backgroundColor: 'rgba(56,189,248,0.1)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--cyan-400)',
                  borderBottom: '1px solid rgba(56,189,248,0.2)',
                }}
              >
                Upscaled ({item.output_width}×{item.output_height})
              </div>
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }} className="checkerboard-bg">
                <img
                  src={item.preview_url}
                  alt="Upscaled"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Hint Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0.6rem',
          backgroundColor: 'rgba(11, 15, 25, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          gap: '1.5rem',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span>Drag slider to compare</span>
        <span>•</span>
        <span>Hold Space to toggle original</span>
        <span>•</span>
        <span>Scroll / +/- to zoom</span>
        <span>•</span>
        <span>Esc to close</span>
      </div>
    </div>
  );
}
