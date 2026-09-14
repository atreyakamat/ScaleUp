import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Terminal,
  Layers,
  Copy,
  Check,
  Shield,
  Activity,
  Github,
  ChevronDown,
  ChevronUp,
  HardDrive,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

import { CompareSlider } from './components/CompareSlider';

// Pre-packaged high-res demo comparison pair (generated via realesrgan-x4plus)
const DEMO_ITEM = {
  item_id: 'demo-sample-01',
  original_name: 'original_sample.jpg',
  upscaled_name: 'scaleup_4x_upscaled.png',
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

const MODELS_DATA = [
  {
    id: 'realesrgan-x4plus',
    name: 'Real-ESRGAN x4+',
    category: 'Photography & Real-World',
    tagColor: 'var(--cyan-400)',
    scales: '2x, 4x',
    architecture: 'RRDBNet (999 layers)',
    tileRecommend: '128px (Vega 8 Tuned)',
    description: 'Universal super-resolution model for photographs, organic textures, landscapes, and fine details without synthetic artifacts.',
  },
  {
    id: 'realesrnet-x4plus',
    name: 'Real-ESRNet x4+',
    category: 'Denoising & Smooth Gradients',
    tagColor: 'var(--indigo-400)',
    scales: '2x, 4x',
    architecture: 'RRDBNet (Denoising Variant)',
    tileRecommend: '64px (Ultra-Safe)',
    description: 'Denoising and artifact cleanup model. Restores compressed JPEG images, smooths pixelation, and refines portrait skin tones.',
  },
  {
    id: 'realesrgan-x4plus-anime',
    name: 'Real-ESRGAN Anime',
    category: 'Manga, Anime & UI Vectors',
    tagColor: 'var(--rose-400)',
    scales: '4x',
    architecture: 'Compact CNN (268 layers)',
    tileRecommend: '128px / 256px',
    description: 'Specially trained on anime illustrations, digital art, line drawings, and vector icons. Retains razor-sharp outlines.',
  },
  {
    id: 'realesr-animevideov3',
    name: 'Real-ESR AnimeVideo v3',
    category: 'Ultra-Fast Throughput',
    tagColor: 'var(--emerald-400)',
    scales: '2x, 3x, 4x',
    architecture: 'Compact V3',
    tileRecommend: 'Auto / 256px',
    description: 'Low-latency, lightweight architecture designed for high-throughput batch workloads, video frames, and rapid previews.',
  },
];

const FAQS = [
  {
    q: 'How does ScaleUp run on AMD integrated graphics without crashing?',
    a: 'ScaleUp uses NCNN-Vulkan instead of heavy PyTorch/ROCm runtimes. By executing direct C++ FP16 compute via Mesa’s RADV driver and enforcing safe tile clamping (≤128px for Vega 8), intermediate activation buffers stay well within shared UMA limits (<600MB), completely protecting the Hyprland/Wayland compositor from GPU memory crashes.',
  },
  {
    q: 'Does ScaleUp work on other GPUs like NVIDIA or Intel?',
    a: 'Yes! ScaleUp leverages the standard Vulkan 1.4 compute API. It runs natively on AMD Radeon (integrated & discrete), Intel Iris Xe / Arc GPUs, NVIDIA GeForce GPUs, and software Vulkan fallbacks (Lavapipe).',
  },
  {
    q: 'Why NCNN Vulkan instead of PyTorch or ONNX?',
    a: 'PyTorch packages gigabytes of CUDA/ROCm dependencies and consumes 4GB–8GB of RAM even at idle. NCNN-Vulkan has zero Python overhead during tensor compute, starts in under 1.5 seconds, and operates within a tiny ~60MB RAM footprint.',
  },
  {
    q: 'Are any images or telemetry sent to the cloud?',
    a: 'Never. ScaleUp is 100% self-hosted, local, and air-gapped. Your images never leave your machine, eliminating subscription costs, cloud privacy breaches, and bandwidth bottlenecks.',
  },
  {
    q: 'What formats and resolutions are supported?',
    a: 'ScaleUp supports .png, .jpg, .jpeg, .webp, and .bmp. It includes pre-flight header validation, rejecting corrupted or zero-byte files, and automatically clamps tile sizes on images exceeding 4K resolution.',
  },
];

export default function App() {
  const [copiedCmd, setCopiedCmd] = useState('');
  const [activeDeployTab, setActiveDeployTab] = useState('cli');
  const [openFaq, setOpenFaq] = useState(null);

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    setTimeout(() => setCopiedCmd(''), 2000);
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(5, 11, 23, 0.92)',
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
          {/* Logo */}
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
                v1.1.0-PROD
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }} className="desktop-nav">
            <a href="#demo" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>
              Live Demo
            </a>
            <a href="#features" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>
              Features
            </a>
            <a href="#benchmarks" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>
              Benchmarks
            </a>
            <a href="#models" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>
              Models
            </a>
            <a href="#quickstart" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>
              Quickstart
            </a>
            <a href="#faq" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <a
              href="https://github.com/atreyakamat/ScaleUp"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface-raised)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Github size={15} />
              <span>GitHub</span>
            </a>

            <a
              href="#quickstart"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)',
              }}
            >
              <Terminal size={14} />
              <span>Run CLI</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        {/* 1. Hero Section */}
        <section style={{ padding: '4rem 1.5rem 3rem', maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: 'rgba(37, 99, 235, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: 'var(--cyan-400)',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
            }}
          >
            <Zap size={14} />
            <span>NCNN Vulkan C++ Compute • Zero PyTorch Overhead (&lt;60MB RAM)</span>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              maxWidth: '900px',
              margin: '0 auto 1.25rem',
              background: 'linear-gradient(135deg, #ffffff 0%, #bae6fd 50%, #60a5fa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Scale Images 4x with Hardware-Accelerated Local AI
          </h1>

          {/* Subtitle */}
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              maxWidth: '720px',
              margin: '0 auto 2.25rem',
              lineHeight: 1.6,
            }}
          >
            Self-hosted, air-gapped super-resolution for Linux desktop power-users. Runs directly on your AMD Radeon, Intel, or NVIDIA GPU with zero cloud subscriptions.
          </p>

          {/* Quick CTA Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
            <a
              href="#demo"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.8rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1rem',
                textDecoration: 'none',
                boxShadow: '0 4px 25px rgba(37, 99, 235, 0.45)',
              }}
            >
              <span>Try Interactive Demo</span>
              <ArrowRight size={17} />
            </a>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
                backgroundColor: 'var(--bg-surface-raised)',
                border: '1px solid var(--border-subtle)',
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.88rem',
                color: 'var(--cyan-400)',
              }}
            >
              <span>ScaleUp --bg</span>
              <button
                onClick={() => handleCopy('ScaleUp --bg', 'hero-cmd')}
                title="Copy Command"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {copiedCmd === 'hero-cmd' ? <Check size={16} color="var(--emerald-400)" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Feature Highlights Strip */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '2rem',
              flexWrap: 'wrap',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="var(--emerald-400)" />
              <span>AMD Vega 8 / RADV Optimized</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="var(--emerald-400)" />
              <span>Hyprland Desktop Safe (&lt;600MB UMA)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="var(--emerald-400)" />
              <span>100% Offline & Air-Gapped</span>
            </div>
          </div>
        </section>

        {/* 2. Interactive Before/After Split Viewer Section */}
        <section id="demo" style={{ padding: '2rem 1.5rem 4rem', maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--cyan-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Interactive Inspection Suite
            </span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.35rem', marginBottom: '0.75rem' }}>
              Real-ESRGAN 4x Quality Comparison
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto' }}>
              Drag the split line to compare the authentic low-resolution 220×220 input against the 880×880 4x super-resolution reconstruction.
            </p>
          </div>

          {/* Embedded Slider Container */}
          <div
            className="glass-panel"
            style={{
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              boxShadow: '0 20px 50px rgba(2, 6, 23, 0.7)',
              marginBottom: '2rem',
            }}
          >
            <div style={{ height: '620px', position: 'relative' }}>
              <CompareSlider item={DEMO_ITEM} onClose={() => {}} />
            </div>
          </div>

          {/* Technical Telemetry Badges */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
            }}
          >
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Resolution Increase</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>4x Super-Resolution</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--cyan-400)', marginTop: '0.2rem' }}>48,400 → 774,400 Pixels</div>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Deep Learning Model</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>Real-ESRGAN x4+</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--blue-300)', marginTop: '0.2rem' }}>RRDBNet (999 Tensor Layers)</div>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Operational Footprint</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>59.8 MB RAM</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--emerald-400)', marginTop: '0.2rem' }}>Zero PyTorch Runtime Overhead</div>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Compute Kernel</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>NCNN Vulkan 1.4</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--indigo-400)', marginTop: '0.2rem' }}>FP16 Half-Precision Shaders</div>
            </div>
          </div>
        </section>

        {/* 3. Core Features Grid */}
        <section id="features" style={{ padding: '4rem 1.5rem', backgroundColor: 'rgba(7, 14, 30, 0.6)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--cyan-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Engineered for Performance
              </span>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.35rem', marginBottom: '0.75rem' }}>
                Architected for Local Desktop Hardware
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '640px', margin: '0 auto' }}>
                ScaleUp is designed from the ground up to solve the memory exhaustion and stability issues plaguing local deep learning tools.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {[
                {
                  icon: <Zap size={22} color="var(--cyan-400)" />,
                  title: 'Zero PyTorch Overhead',
                  desc: 'Bypasses Python deep learning runtimes completely. Powered by a lean, bare-metal C++ NCNN Vulkan binary that launches cold in under 1.5 seconds.',
                },
                {
                  icon: <Shield size={22} color="var(--blue-400)" />,
                  title: 'AMD Vega 8 Safeguards',
                  desc: 'Enforces hardware tile clamping (≤128px) and shared memory allocation limits (<600MB UMA) so your desktop compositor (Hyprland / Wayland) never crashes.',
                },
                {
                  icon: <Activity size={22} color="var(--emerald-400)" />,
                  title: 'Adaptive Black-Pixel Recovery',
                  desc: 'Detects shader buffer overflows automatically via pixel extrema analysis. If a black output occurs, it halves tile size and retries inference transparently.',
                },
                {
                  icon: <Layers size={22} color="var(--indigo-400)" />,
                  title: 'Multi-Format Batch Ingestion',
                  desc: 'Direct drag-and-drop batch processing for .png, .jpg, .jpeg, .webp, and .bmp formats with pre-flight header validation that skips corrupted files cleanly.',
                },
                {
                  icon: <Terminal size={22} color="var(--amber-400)" />,
                  title: 'Background Daemon CLI',
                  desc: 'Run ScaleUp as a persistent background service with `ScaleUp --bg`. Monitor memory RSS, GPU device, and model registry directly from your terminal.',
                },
                {
                  icon: <HardDrive size={22} color="var(--rose-400)" />,
                  title: '100% Air-Gapped Privacy',
                  desc: 'Zero telemetry, zero cloud dependencies. Your photos, wallpapers, and confidential assets stay securely on your physical machine at all times.',
                },
              ].map((feat) => (
                <div
                  key={feat.title}
                  className="glass-panel glass-panel-hover"
                  style={{
                    padding: '1.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(12, 22, 45, 0.9)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1.25rem',
                    }}
                  >
                    {feat.icon}
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.6rem' }}>{feat.title}</h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Efficiency Benchmarks Table */}
        <section id="benchmarks" style={{ padding: '4rem 1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--cyan-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Performance Metrics
            </span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.35rem', marginBottom: '0.75rem' }}>
              Architectural Efficiency Comparison
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '620px', margin: '0 auto' }}>
              See how ScaleUp’s lightweight C++ Vulkan pipeline compares against conventional PyTorch CUDA/ROCm runtimes and cloud services.
            </p>
          </div>

          <div
            className="glass-panel"
            style={{
              borderRadius: 'var(--radius-lg)',
              overflowX: 'auto',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(10, 20, 40, 0.7)' }}>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Metric</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Traditional PyTorch / CUDA</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cloud Upscalers (e.g. Magnific)</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--cyan-400)', fontWeight: 700, backgroundColor: 'rgba(37, 99, 235, 0.15)' }}>ScaleUp (NCNN Vulkan)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { metric: 'Idle Process RAM', pytorch: '4.2 GB – 8.5 GB', cloud: '0 MB (Server side)', scaleup: '59.8 MB RSS' },
                  { metric: 'GPU Buffer Allocation', pytorch: '3.5 GB – 6.0 GB VRAM', cloud: '0 MB', scaleup: '< 600 MB UMA (Dynamic)' },
                  { metric: 'Cold Launch Time', pytorch: '14 – 28 seconds', cloud: 'Network upload latency', scaleup: '< 1.5 seconds' },
                  { metric: 'Hardware Minimum', pytorch: 'Dedicated NVIDIA GPU', cloud: 'Fast internet connection', scaleup: 'AMD Vega 8 / Intel Xe / Any Vulkan' },
                  { metric: 'Desktop Crash Risk', pytorch: 'High (OOM kills Wayland)', cloud: 'None', scaleup: 'Zero (Tile clamped)' },
                  { metric: 'Data Privacy', pytorch: 'Local, but heavy dependencies', cloud: 'Uploaded to 3rd party', scaleup: '100% Offline & Air-Gapped' },
                  { metric: 'Software Cost', pytorch: 'Free (High electricity)', cloud: '$19 – $39 / month', scaleup: '100% Free (MIT Licensed)' },
                ].map((row) => (
                  <tr key={row.metric} style={{ borderBottom: '1px solid rgba(56, 189, 248, 0.08)' }}>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{row.metric}</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{row.pytorch}</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{row.cloud}</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.88rem', fontWeight: 700, color: 'var(--cyan-400)', backgroundColor: 'rgba(37, 99, 235, 0.08)' }}>{row.scaleup}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Pre-Trained AI Models Matrix */}
        <section id="models" style={{ padding: '4rem 1.5rem', backgroundColor: 'rgba(7, 14, 30, 0.6)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--cyan-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Model Architecture Matrix
              </span>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.35rem', marginBottom: '0.75rem' }}>
                4 Pre-Trained Super-Resolution Models
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '640px', margin: '0 auto' }}>
                Pre-converted into NCNN Vulkan binary representations (.bin & .param) for instant hardware execution.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {MODELS_DATA.map((m) => (
                <div
                  key={m.id}
                  className="glass-panel glass-panel-hover"
                  style={{
                    padding: '1.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(37, 99, 235, 0.25)',
                          color: 'var(--blue-300)',
                          fontWeight: 700,
                        }}
                      >
                        {m.scales}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: m.tagColor, fontWeight: 600 }}>{m.category}</span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{m.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1.25rem' }}>
                      {m.description}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>Architecture:</strong> {m.architecture}</div>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>Tile Setting:</strong> {m.tileRecommend}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Quickstart & Deployment Terminal Tabs */}
        <section id="quickstart" style={{ padding: '4rem 1.5rem', maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--cyan-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Run Anywhere in Seconds
            </span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.35rem', marginBottom: '0.75rem' }}>
              Quick Start & Deployment
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Choose your preferred installation method: native Linux daemon, Docker container, or one-click source bootstrap.
            </p>
          </div>

          {/* Deployment Mode Switcher */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              backgroundColor: 'var(--bg-surface-raised)',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1.5rem',
              maxWidth: '480px',
              margin: '0 auto 1.5rem',
            }}
          >
            {[
              { id: 'cli', label: 'CLI Daemon' },
              { id: 'docker', label: 'Docker Container' },
              { id: 'seed', label: 'One-Click Script' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDeployTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '0.6rem 1rem',
                  borderRadius: '9px',
                  border: 'none',
                  backgroundColor: activeDeployTab === tab.id ? 'var(--blue-600)' : 'transparent',
                  color: activeDeployTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: activeDeployTab === tab.id ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: CLI Daemon */}
          {activeDeployTab === 'cli' && (
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Persistent Background Daemon</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                Installed into `~/.local/bin/ScaleUp`. Runs decoupled in the background with real-time RAM and GPU telemetry on port 7756:
              </p>

              <div
                style={{
                  backgroundColor: '#020617',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: '10px',
                  padding: '1rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.88rem',
                  color: 'var(--cyan-400)',
                  marginBottom: '1.5rem',
                  position: 'relative',
                }}
              >
                <div style={{ marginBottom: '0.4rem' }}># Start daemon on port 7756</div>
                <div style={{ color: '#ffffff', fontWeight: 700 }}>ScaleUp --bg</div>
                <div style={{ margin: '0.6rem 0 0.4rem', color: 'var(--text-muted)' }}># Open web interface directly</div>
                <div style={{ color: '#ffffff', fontWeight: 700 }}>ScaleUp open</div>
                <div style={{ margin: '0.6rem 0 0.4rem', color: 'var(--text-muted)' }}># View real-time memory & GPU telemetry</div>
                <div style={{ color: '#ffffff', fontWeight: 700 }}>ScaleUp status</div>

                <button
                  onClick={() => handleCopy('ScaleUp --bg && ScaleUp open', 'cli-box')}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                  title="Copy Commands"
                >
                  {copiedCmd === 'cli-box' ? <Check size={18} color="var(--emerald-400)" /> : <Copy size={18} />}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <div><code>ScaleUp stop</code> — Shut down daemon cleanly</div>
                <div><code>ScaleUp logs</code> — Stream real-time output log</div>
                <div><code>ScaleUp restart</code> — Restart service</div>
                <div><code>ScaleUp clean</code> — Purge 24h+ scratch archives</div>
              </div>
            </div>
          )}

          {/* Tab 2: Docker Container */}
          {activeDeployTab === 'docker' && (
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Official Docker Hub Image (v1.1)</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                Run with native GPU passthrough (`/dev/dri`) for AMD Radeon or Intel Iris Xe hardware acceleration:
              </p>

              <div
                style={{
                  backgroundColor: '#020617',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: '10px',
                  padding: '1rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.84rem',
                  color: 'var(--cyan-400)',
                  marginBottom: '1.25rem',
                  overflowX: 'auto',
                  position: 'relative',
                }}
              >
                <div>docker run -d \</div>
                <div>&nbsp;&nbsp;--name scaleup \</div>
                <div>&nbsp;&nbsp;--restart unless-stopped \</div>
                <div>&nbsp;&nbsp;-p 7756:7756 \</div>
                <div>&nbsp;&nbsp;--device /dev/dri:/dev/dri \</div>
                <div style={{ color: '#ffffff', fontWeight: 700 }}>&nbsp;&nbsp;atreya7/scaleup:1.1</div>

                <button
                  onClick={() => handleCopy('docker run -d --name scaleup --restart unless-stopped -p 7756:7756 --device /dev/dri:/dev/dri atreya7/scaleup:1.1', 'docker-box')}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                  title="Copy Docker Run Command"
                >
                  {copiedCmd === 'docker-box' ? <Check size={18} color="var(--emerald-400)" /> : <Copy size={18} />}
                </button>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Or use Docker Compose: <code>docker compose up -d</code>
              </div>
            </div>
          )}

          {/* Tab 3: One-Click Script */}
          {activeDeployTab === 'seed' && (
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>One-Command Source Bootstrap</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                Clones the repository, sets up the virtualenv, downloads models, builds the SPA, and links the CLI tool:
              </p>

              <div
                style={{
                  backgroundColor: '#020617',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: '10px',
                  padding: '1rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  color: 'var(--cyan-400)',
                  overflowX: 'auto',
                  position: 'relative',
                }}
              >
                <div>git clone https://github.com/atreyakamat/ScaleUp.git</div>
                <div>cd ScaleUp</div>
                <div style={{ color: '#ffffff', fontWeight: 700 }}>./scripts/seed.sh</div>

                <button
                  onClick={() => handleCopy('git clone https://github.com/atreyakamat/ScaleUp.git && cd ScaleUp && ./scripts/seed.sh', 'seed-box')}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                  title="Copy Setup Commands"
                >
                  {copiedCmd === 'seed-box' ? <Check size={18} color="var(--emerald-400)" /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 7. FAQ Accordion */}
        <section id="faq" style={{ padding: '4rem 1.5rem', backgroundColor: 'rgba(7, 14, 30, 0.6)', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ maxWidth: '840px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--cyan-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Got Questions?
              </span>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.35rem', marginBottom: '0.75rem' }}>
                Frequently Asked Questions
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {FAQS.map((faq, idx) => (
                <div
                  key={faq.q}
                  className="glass-panel"
                  style={{
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    style={{
                      width: '100%',
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{faq.q}</span>
                    {openFaq === idx ? <ChevronUp size={18} color="var(--cyan-400)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </button>

                  {openFaq === idx && (
                    <div
                      style={{
                        padding: '0 1.5rem 1.25rem',
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                        borderTop: '1px solid rgba(56, 189, 248, 0.08)',
                        paddingTop: '1rem',
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '2rem 1.5rem',
          backgroundColor: 'rgba(5, 11, 23, 0.96)',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              ScaleUp — Local Hardware-Accelerated AI Super-Resolution
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Built with NCNN Vulkan C++, FastAPI & React • MIT Licensed • Created by Atreya Kamat
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <a href="https://github.com/atreyakamat/ScaleUp" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Github size={15} />
              <span>GitHub</span>
            </a>
            <a href="https://hub.docker.com/r/atreya7/scaleup" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Layers size={15} />
              <span>Docker Hub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
