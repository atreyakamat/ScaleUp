import { useState, useRef, useEffect, useCallback } from 'react';

export function useBatchJob() {
  const [jobState, setJobState] = useState({
    jobId: null,
    status: 'IDLE', // IDLE | STAGED | UPLOADING | PROCESSING | COMPLETED | PARTIAL_FAILURE | CANCELLED | FAILED
    progress: {
      current_index: 0,
      total_items: 0,
      percentage: 0,
      current_file: null,
      elapsed_seconds: 0,
      eta_seconds: null,
    },
    items: [],
    warnings: [],
    error: null,
  });

  const eventSourceRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const cleanupConnections = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanupConnections();
  }, [cleanupConnections]);

  const pollJobStatus = useCallback(async (jobId) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      const data = await res.json();

      setJobState((prev) => ({
        ...prev,
        status: data.status.toUpperCase(),
        progress: data.progress,
        items: data.items,
        warnings: data.warnings || [],
      }));

      if (['COMPLETED', 'PARTIAL_FAILURE', 'FAILED', 'CANCELLED'].includes(data.status.toUpperCase())) {
        cleanupConnections();
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, [cleanupConnections]);

  const subscribeToJob = useCallback((jobId) => {
    cleanupConnections();

    try {
      const es = new EventSource(`/api/jobs/${jobId}/events`);
      eventSourceRef.current = es;

      const handleUpdate = (event) => {
        try {
          const data = JSON.parse(event.data);
          const currentStatus = data.status.toUpperCase();
          setJobState((prev) => ({
            ...prev,
            status: currentStatus,
            progress: data.progress,
            items: data.items,
            warnings: data.warnings || [],
          }));

          if (['COMPLETED', 'PARTIAL_FAILURE', 'FAILED', 'CANCELLED'].includes(currentStatus)) {
            cleanupConnections();
          }
        } catch (e) {
          console.error('SSE JSON parse error:', e);
        }
      };

      es.addEventListener('init', handleUpdate);
      es.addEventListener('start', handleUpdate);
      es.addEventListener('item_start', handleUpdate);
      es.addEventListener('item_done', handleUpdate);
      es.addEventListener('item_skip', handleUpdate);
      es.addEventListener('complete', handleUpdate);
      es.addEventListener('cancelled', handleUpdate);

      es.onerror = () => {
        // Fallback to polling if SSE fails
        cleanupConnections();
        pollIntervalRef.current = setInterval(() => pollJobStatus(jobId), 1000);
      };
    } catch (err) {
      // Direct polling fallback
      pollIntervalRef.current = setInterval(() => pollJobStatus(jobId), 1000);
    }
  }, [cleanupConnections, pollJobStatus]);

  const startBatch = async (files, config) => {
    cleanupConnections();
    setJobState({
      jobId: null,
      status: 'UPLOADING',
      progress: {
        current_index: 0,
        total_items: files.length,
        percentage: 0,
        current_file: 'Uploading payload...',
        elapsed_seconds: 0,
        eta_seconds: null,
      },
      items: [],
      warnings: [],
      error: null,
    });

    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    formData.append('model', config.model);
    formData.append('scale', config.scale.toString());
    formData.append('tile_size', config.tile_size.toString());
    formData.append('threads', config.threads || '1:2:2');

    try {
      const res = await fetch('/api/jobs/batch', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Failed to start batch job' }));
        throw new Error(errorData.detail || 'Server rejected batch request');
      }

      const data = await res.json();
      setJobState((prev) => ({
        ...prev,
        jobId: data.job_id,
        status: 'PROCESSING',
        warnings: data.warnings || [],
      }));

      subscribeToJob(data.job_id);
    } catch (err) {
      setJobState((prev) => ({
        ...prev,
        status: 'FAILED',
        error: err.message,
      }));
    }
  };

  const cancelBatch = async () => {
    if (!jobState.jobId) return;
    try {
      await fetch(`/api/jobs/${jobState.jobId}/cancel`, { method: 'POST' });
      setJobState((prev) => ({
        ...prev,
        status: 'CANCELLED',
      }));
    } catch (err) {
      console.error('Failed to cancel job:', err);
    }
  };

  const exportZip = () => {
    if (!jobState.jobId) return;
    const downloadUrl = `/api/jobs/${jobState.jobId}/export`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `upscaled_batch_${jobState.jobId}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    cleanupConnections();
    setJobState({
      jobId: null,
      status: 'IDLE',
      progress: {
        current_index: 0,
        total_items: 0,
        percentage: 0,
        current_file: null,
        elapsed_seconds: 0,
        eta_seconds: null,
      },
      items: [],
      warnings: [],
      error: null,
    });
  };

  return {
    ...jobState,
    startBatch,
    cancelBatch,
    exportZip,
    reset,
  };
}
