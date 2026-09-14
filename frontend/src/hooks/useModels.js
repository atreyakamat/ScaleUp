import { useState, useEffect, useCallback } from 'react';

export const FALLBACK_MODELS = [
  {
    id: 'realesrgan-x4plus',
    name: 'Real-ESRGAN x4+',
    description: 'Universal model for photorealistic photography, natural textures, and fine details.',
    scales: [2, 4],
    default_scale: 4,
    architecture: 'RRDBNet (999 layers)',
    ideal_use: 'Photography & Textures',
    type: 'photo',
  },
  {
    id: 'realesrnet-x4plus',
    name: 'Real-ESRNet x4+',
    description: 'Denoising variant for smooth gradients, compression noise cleanup, and portrait skin tones.',
    scales: [2, 4],
    default_scale: 4,
    architecture: 'RRDBNet (Denoise)',
    ideal_use: 'Denoising & Smooth Gradients',
    type: 'denoise',
  },
  {
    id: 'realesrgan-x4plus-anime',
    name: 'Real-ESRGAN Anime',
    description: 'Optimized for anime art, manga, vector illustrations, line art, and UI graphics.',
    scales: [4],
    default_scale: 4,
    architecture: 'Compact CNN (268 layers)',
    ideal_use: 'Anime, Manga & Vector UI',
    type: 'anime',
  },
  {
    id: 'realesr-animevideov3',
    name: 'Real-ESR AnimeVideo v3',
    description: 'Ultra-low latency model designed for high-throughput batch workloads and rapid previews.',
    scales: [2, 3, 4],
    default_scale: 4,
    architecture: 'Compact V3',
    ideal_use: 'High-Throughput Batches',
    type: 'fast',
  },
];

export function useModels() {
  const [models, setModels] = useState(FALLBACK_MODELS);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [apiUrl, setApiUrl] = useState(''); // empty string means relative / same host

  const checkConnectivity = useCallback(async () => {
    try {
      const endpoint = apiUrl ? `${apiUrl}/api/health` : '/api/health';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        setIsConnected(true);
        return true;
      }
    } catch (err) {
      // Backend not available or CORS/mixed content on static host
      setIsConnected(false);
      setHealth(null);
    }
    return false;
  }, [apiUrl]);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const connected = await checkConnectivity();
      if (connected) {
        const endpoint = apiUrl ? `${apiUrl}/api/models` : '/api/models';
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          setModels(data);
        }
      } else {
        // Use standard model registry
        setModels(FALLBACK_MODELS);
      }
    } catch {
      setModels(FALLBACK_MODELS);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, checkConnectivity]);

  useEffect(() => {
    fetchModels();
    const interval = setInterval(checkConnectivity, 12000);
    return () => clearInterval(interval);
  }, [fetchModels, checkConnectivity]);

  const triggerCleanup = async () => {
    if (!isConnected) return;
    try {
      const endpoint = apiUrl ? `${apiUrl}/api/system/cleanup` : '/api/system/cleanup';
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        await checkConnectivity();
      }
    } catch (err) {
      console.warn('Manual cleanup error:', err);
    }
  };

  return {
    models,
    health,
    loading,
    isConnected,
    apiUrl,
    setApiUrl,
    checkConnectivity,
    triggerCleanup,
  };
}
