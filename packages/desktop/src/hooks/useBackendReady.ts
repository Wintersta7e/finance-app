import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';

const POLL_INTERVAL = 500;
const TIMEOUT_MS = 15_000;

export function useBackendReady() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startTime = useRef(0);

  // Initialize on first effect run (not during render)
  useEffect(() => {
    startTime.current = Date.now();
  }, []);

  const check = useCallback(async () => {
    const healthy = await api.checkHealth();
    if (healthy) {
      setReady(true);
      return;
    }
    if (Date.now() - startTime.current > TIMEOUT_MS) {
      setError('Backend failed to start. Check the application logs.');
    }
  }, []);

  const retry = useCallback(() => {
    setError(null);
    startTime.current = Date.now();
  }, []);

  useEffect(() => {
    if (ready || error) return;
    // First check fires immediately via setTimeout (not synchronous in effect body)
    const immediate = setTimeout(() => void check(), 0);
    const timer = setInterval(() => void check(), POLL_INTERVAL);
    return () => { clearTimeout(immediate); clearInterval(timer); };
  }, [ready, error, check]);

  return { ready, error, retry };
}
