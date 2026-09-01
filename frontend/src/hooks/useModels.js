import { useState, useEffect, useCallback } from 'react';

export function useModels() {
  const [models, setModels] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      console.error('Failed to fetch system health:', err);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [modelsRes, healthRes] = await Promise.all([
        fetch('/api/models'),
        fetch('/api/health'),
      ]);

      if (!modelsRes.ok) throw new Error('Failed to load AI model registry');
      const modelsData = await modelsRes.json();
      setModels(modelsData);

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
    // Refresh health telemetry every 10 seconds
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [fetchModels, fetchHealth]);

  const triggerCleanup = async () => {
    try {
      const res = await fetch('/api/system/cleanup', { method: 'POST' });
      if (res.ok) {
        await fetchHealth();
      }
    } catch (err) {
      console.error('Manual cleanup failed:', err);
    }
  };

  return {
    models,
    health,
    loading,
    error,
    refreshHealth: fetchHealth,
    triggerCleanup,
  };
}
