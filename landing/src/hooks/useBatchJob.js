import { useState, useRef, useEffect, useCallback } from 'react';

export function useBatchJob(apiUrl = '') {
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
      const endpoint = apiUrl ? `${apiUrl}/api/jobs/${jobId}` : `/api/jobs/${jobId}`;
      const res = await fetch(endpoint);
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
      console.warn('Polling error:', err);
    }
  }, [apiUrl, cleanupConnections]);

  const subscribeToJob = useCallback((jobId) => {
    cleanupConnections();
    const streamEndpoint = apiUrl ? `${apiUrl}/api/jobs/${jobId}/events` : `/api/jobs/${jobId}/events`;

    try {
      const es = new EventSource(streamEndpoint);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
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
        } catch (e) {
          console.error('SSE JSON parse error:', e);
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        if (!pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(() => pollJobStatus(jobId), 1500);
        }
      };
    } catch (err) {
      console.warn('SSE initiation failed, using polling fallback:', err);
      pollIntervalRef.current = setInterval(() => pollJobStatus(jobId), 1500);
    }
  }, [apiUrl, cleanupConnections, pollJobStatus]);

  const startBatch = async (files, config) => {
    if (!files || files.length === 0) return;

    setJobState((prev) => ({
      ...prev,
      status: 'UPLOADING',
      error: null,
      warnings: [],
      items: [],
      progress: {
        current_index: 0,
        total_items: files.length,
        percentage: 0,
        current_file: 'Preparing batch ingest...',
        elapsed_seconds: 0,
        eta_seconds: null,
      },
    }));

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      formData.append('model', config.model);
      formData.append('scale', config.scale);
      formData.append('tile_size', config.tile_size);
      formData.append('threads', config.threads || '1:2:2');

      const batchEndpoint = apiUrl ? `${apiUrl}/api/jobs/batch` : '/api/jobs/batch';
      const res = await fetch(batchEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Batch ingestion failed');
      }

      const data = await res.json();
      setJobState((prev) => ({
        ...prev,
        jobId: data.job_id,
        status: data.status.toUpperCase(),
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
      const cancelEndpoint = apiUrl ? `${apiUrl}/api/jobs/${jobState.jobId}/cancel` : `/api/jobs/${jobState.jobId}/cancel`;
      await fetch(cancelEndpoint, { method: 'POST' });
    } catch (err) {
      console.error('Cancel request failed:', err);
    }
  };

  const exportZip = () => {
    if (!jobState.jobId) return;
    const exportEndpoint = apiUrl ? `${apiUrl}/api/jobs/${jobState.jobId}/export` : `/api/jobs/${jobState.jobId}/export`;
    const link = document.createElement('a');
    link.href = exportEndpoint;
    link.download = `scaleup_${jobState.jobId}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
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
    jobId: jobState.jobId,
    status: jobState.status,
    progress: jobState.progress,
    items: jobState.items,
    warnings: jobState.warnings,
    error: jobState.error,
    startBatch,
    cancelBatch,
    exportZip,
    reset,
  };
}
