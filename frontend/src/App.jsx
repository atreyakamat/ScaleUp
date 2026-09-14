import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Sliders,
  Download,
  RotateCcw,
  CheckCircle2,
  Terminal,
  Layers,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Activity,
  Maximize2,
  Columns,
  Eye,
  Settings,
  Github,
  Server,
  Play,
} from 'lucide-react';

import { useModels, FALLBACK_MODELS } from './hooks/useModels';
import { useBatchJob } from './hooks/useBatchJob';
import { Dropzone } from './components/Dropzone';
import { ControlPanel } from './components/ControlPanel';
import { ProgressBar } from './components/ProgressBar';
import { ImageGrid } from './components/ImageGrid';
import { CompareSlider } from './components/CompareSlider';

// Pre-packaged high-res demo comparison pair
const DEMO_ITEM = {
  item_id: 'demo-sample-01',
  original_name: 'sample_photo.jpg',
  upscaled_name: 'sample_photo_4x_upscaled.png',
  original_url: '/demo_original.jpg',
  preview_url: '/demo_upscaled.png',
  original_width: 220,
  original_height: 220,
  upscaled_width: 880,
  upscaled_height: 880,
  scale: 4,
  model: 'realesrgan-x4plus',
  status: 'COMPLETED',
};

export default function App() {
  const {
    models,
    health,
    isConnected,
    apiUrl,
    setApiUrl,
    checkConnectivity,
    triggerCleanup,
  } = useModels();

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
  } = useBatchJob(apiUrl);

  const [activeTab, setActiveTab] = useState('demo'); // 'demo' | 'studio' | 'models' | 'quickstart'
  const [stagedFiles, setStagedFiles] = useState([]);
  const [config, setConfig] = useState({
    model: 'realesrgan-x4plus',
    scale: 4,
    tile_size: 128,
    threads: '1:2:2',
  });
  const [activeCompareItem, setActiveCompareItem] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl || 'http://127.0.0.1:7756');
  const [copiedCmd, setCopiedCmd] = useState('');

  const isProcessing = ['UPLOADING', 'PROCESSING'].includes(status);
  const isFinished = ['COMPLETED', 'PARTIAL_FAILURE', 'FAILED', 'CANCELLED'].includes(status);

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    setTimeout(() => setCopiedCmd(''), 2000);
  };

  const handleStartUpscaling = () => {
    if (stagedFiles.length === 0 || isProcessing) return;
    if (!isConnected) {
      setShowConnectModal(true);
      return;
    }
    const rawFiles = stagedFiles.map((item) => item.file);
    startBatch(rawFiles, config);
  };

  const handleResetAll = () => {
    setStagedFiles([]);
    setSelectedItemIds([]);
    reset();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Glass Navigation Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(5, 11, 23, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 90,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0.85rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Logo & Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 0 20px rgba(37, 99, 235, 0.5)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    background: 'linear-gradient(90deg, #f0f6fc 0%, #60a5fa 50%, #38bdf8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  ScaleUp
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                    color: 'var(--blue-300)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                >
                  v1.1.0
                </span>
              </div>
            </div>
          </div>

          {/* Center Nav Pills */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface-raised)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {[
              { id: 'demo', label: 'Interactive Demo' },
              { id: 'studio', label: 'Studio' },
              { id: 'models', label: 'Models' },
              { id: 'quickstart', label: 'Quickstart' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '7px',
                  border: 'none',
                  backgroundColor: activeTab === tab.id ? 'var(--blue-600)' : 'transparent',
                  color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right Action Icons & Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setShowConnectModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.75rem',
                padding: '0.45rem 0.8rem',
                borderRadius: '8px',
                border: isConnected
                  ? '1px solid rgba(52, 211, 153, 0.35)'
                  : '1px solid rgba(56, 189, 248, 0.25)',
                backgroundColor: isConnected
                  ? 'rgba(52, 211, 153, 0.12)'
                  : 'rgba(37, 99, 235, 0.12)',
                color: isConnected ? 'var(--emerald-400)' : 'var(--cyan-400)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              title="Configure API Engine Connection"
            >
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isConnected ? 'var(--emerald-400)' : 'var(--cyan-400)',
                }}
              />
              <span>{isConnected ? 'Daemon Connected' : 'Showcase Mode'}</span>
            </button>

            <a
              href="https://github.com/atreyakamat/ScaleUp"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.8rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface-raised)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Github size={15} />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
        {/* Tab 1: Interactive Demo Showcase (Default) */}
        {activeTab === 'demo' && (
          <div>
            {/* Hero Heading */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(37, 99, 235, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  color: 'var(--cyan-400)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                }}
              >
                <Zap size={13} />
                <span>NCNN Vulkan C++ Acceleration • Zero PyTorch Runtime</span>
              </div>
              <h2
                style={{
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                  marginBottom: '0.75rem',
                  background: 'linear-gradient(135deg, #ffffff 0%, #bae6fd 60%, #60a5fa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Local AI Super-Resolution
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '640px', margin: '0 auto' }}>
                Interactive split viewer demonstrating 4x Real-ESRGAN super-resolution. Drag the slider to inspect restored textures and edge sharpness.
              </p>
            </div>

            {/* Embedded Live Split Slider */}
            <div
              className="glass-panel"
              style={{
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                marginBottom: '2rem',
                border: '1px solid rgba(56, 189, 248, 0.2)',
              }}
            >
              <div style={{ height: '620px', position: 'relative' }}>
                <CompareSlider item={DEMO_ITEM} onClose={() => {}} />
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginBottom: '2.5rem',
              }}
            >
              {[
                { title: 'Super-Resolution Scale', val: '4x Resolution', desc: '220×220 → 880×880 pixels' },
                { title: 'Compute Engine', val: 'NCNN Vulkan FP16', desc: 'Hardware-accelerated C++ kernel' },
                { title: 'Memory Footprint', val: '< 60 MB RAM', desc: 'No PyTorch or CUDA overhead' },
                { title: 'Privacy Guarantee', val: '100% Local', desc: 'Zero cloud tracking or uploads' },
              ].map((card, i) => (
                <div
                  key={i}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{card.title}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{card.val}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{card.desc}</div>
                </div>
              ))}
            </div>

            {/* Call to action for Studio */}
            <div
              className="glass-panel"
              style={{
                padding: '2rem',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(10, 20, 40, 0.9) 0%, rgba(17, 32, 61, 0.7) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
              }}
            >
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Ready to Upscale Your Own Images?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '540px', margin: '0 auto 1.5rem' }}>
                Open the Studio to batch process images or run ScaleUp locally with your own hardware accelerator.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setActiveTab('studio')}
                  style={{
                    padding: '0.8rem 1.6rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
                  }}
                >
                  Open Studio Workspace
                </button>
                <button
                  onClick={() => setActiveTab('quickstart')}
                  style={{
                    padding: '0.8rem 1.4rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-raised)',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  View CLI & Docker Setup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Studio Workspace */}
        {activeTab === 'studio' && (
          <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                  Upscaler Studio
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Stage images, pick your deep learning model, and process batches locally.
                </p>
              </div>

              {!isConnected && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    fontSize: '0.78rem',
                    color: 'var(--amber-400)',
                  }}
                >
                  <span>Showcase Mode Active</span>
                  <button
                    onClick={() => setShowConnectModal(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--cyan-400)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      textDecoration: 'underline',
                    }}
                  >
                    Connect Local Daemon
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
              {/* Left Column: Dropzone & Gallery */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Dropzone
                  onFilesAdded={(newFiles) => setStagedFiles((prev) => [...prev, ...newFiles])}
                  disabled={isProcessing}
                />

                {isProcessing && <ProgressBar progress={progress} status={status} />}

                <ImageGrid
                  stagedFiles={stagedFiles}
                  items={items}
                  status={status}
                  selectedIds={selectedItemIds}
                  onToggleSelect={(id) => {
                    setSelectedItemIds((prev) =>
                      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                    );
                  }}
                  onRemoveStaged={(idx) => {
                    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  onCompare={(item) => setActiveCompareItem(item)}
                />
              </div>

              {/* Right Column: Control Panel */}
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
          </div>
        )}

        {/* Tab 3: Models Matrix */}
        {activeTab === 'models' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Pre-Trained AI Models</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto' }}>
                4 specialized deep learning architectures optimized for low-latency Vulkan tensor compute.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {FALLBACK_MODELS.map((m) => (
                <div
                  key={m.id}
                  className="glass-panel glass-panel-hover"
                  style={{
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(37, 99, 235, 0.2)',
                          color: 'var(--blue-300)',
                          fontWeight: 700,
                        }}
                      >
                        {m.scales.map((s) => `${s}x`).join(', ')}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--cyan-400)', fontWeight: 600 }}>{m.ideal_use}</span>
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{m.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                      {m.description}
                    </p>
                  </div>
                  <div
                    style={{
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Architecture: {m.architecture}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Quickstart */}
        {activeTab === 'quickstart' && (
          <div style={{ maxWidth: '840px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Get Started with ScaleUp</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Run locally on your AMD Radeon, Intel, or NVIDIA GPU with zero cloud overhead.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Method 1: Local Daemon CLI */}
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <Terminal size={18} color="var(--cyan-400)" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>1. Local Daemon CLI (Recommended for Linux)</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Launch as a background service on port 7756 with real-time telemetry:
                </p>
                <div
                  style={{
                    backgroundColor: '#030712',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.88rem',
                    color: 'var(--cyan-400)',
                  }}
                >
                  <span>ScaleUp --bg</span>
                  <button
                    onClick={() => handleCopy('ScaleUp --bg', 'cli')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {copiedCmd === 'cli' ? <Check size={16} color="var(--emerald-400)" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Method 2: Docker Container */}
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <Layers size={18} color="var(--blue-400)" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>2. Docker Deployment (GPU Passthrough)</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Run the official container from Docker Hub with hardware acceleration:
                </p>
                <div
                  style={{
                    backgroundColor: '#030712',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.84rem',
                    color: 'var(--cyan-400)',
                    overflowX: 'auto',
                  }}
                >
                  <span>docker run -d -p 7756:7756 --device /dev/dri:/dev/dri atreya7/scaleup:1.1</span>
                  <button
                    onClick={() => handleCopy('docker run -d -p 7756:7756 --device /dev/dri:/dev/dri atreya7/scaleup:1.1', 'docker')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '0.5rem' }}
                  >
                    {copiedCmd === 'docker' ? <Check size={16} color="var(--emerald-400)" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Method 3: One-Click Git Setup */}
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <Zap size={18} color="var(--amber-400)" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>3. One-Click Bootstrap & Model Seed</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Clone and automatically download binaries and models:
                </p>
                <div
                  style={{
                    backgroundColor: '#030712',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    color: 'var(--cyan-400)',
                    overflowX: 'auto',
                  }}
                >
                  <span>git clone https://github.com/atreyakamat/ScaleUp.git && cd ScaleUp && ./scripts/seed.sh</span>
                  <button
                    onClick={() => handleCopy('git clone https://github.com/atreyakamat/ScaleUp.git && cd ScaleUp && ./scripts/seed.sh', 'git')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '0.5rem' }}
                  >
                    {copiedCmd === 'git' ? <Check size={16} color="var(--emerald-400)" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Comparison Modal (when opened from Studio gallery) */}
      {activeCompareItem && (
        <CompareSlider item={activeCompareItem} onClose={() => setActiveCompareItem(null)} />
      )}

      {/* Connect Local Daemon Modal */}
      {showConnectModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(2, 6, 23, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '1rem',
          }}
          onClick={() => setShowConnectModal(false)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '480px',
              width: '100%',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <Server size={22} color="var(--cyan-400)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Connect Local Engine</h3>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              ScaleUp runs 100% locally to protect your privacy and use your GPU. Start the local background engine on your machine:
            </p>

            <div
              style={{
                backgroundColor: '#030712',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9rem',
                color: 'var(--cyan-400)',
                marginBottom: '1.25rem',
              }}
            >
              <span>ScaleUp --bg</span>
              <button
                onClick={() => handleCopy('ScaleUp --bg', 'modal-cli')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {copiedCmd === 'modal-cli' ? <Check size={16} color="var(--emerald-400)" /> : <Copy size={16} />}
              </button>
            </div>

            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              Backend API Endpoint URL:
            </label>
            <input
              type="text"
              value={tempApiUrl}
              onChange={(e) => setTempApiUrl(e.target.value)}
              placeholder="http://127.0.0.1:7756"
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-raised)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setShowConnectModal(false)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setApiUrl(tempApiUrl);
                  setShowConnectModal(false);
                  await checkConnectivity();
                }}
                style={{
                  padding: '0.55rem 1.2rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Clean Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '1.25rem 1.5rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          backgroundColor: 'rgba(5, 11, 23, 0.95)',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>ScaleUp • Local Hardware-Accelerated AI Super-Resolution • MIT License</div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <a href="https://github.com/atreyakamat/ScaleUp" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              GitHub
            </a>
            <a href="https://hub.docker.com/r/atreya7/scaleup" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              Docker Hub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
