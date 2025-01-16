import { useState, useEffect } from 'react';
import { BACKEND_CONFIG } from '../services/backend/config';

export function useBackendStatus(checkInterval = BACKEND_CONFIG.HEALTH_CHECK_INTERVAL) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number;

    const checkStatus = async () => {
      try {
        setIsChecking(true);
        const url = 'https://backend-khaki-omega.vercel.app/api/health';  // Hardcode for testing
        console.log('Checking backend status at:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors',  // Add CORS mode
        });

        console.log('Health check response:', {
          status: response.status,
          ok: response.ok,
          url: response.url
        });

        if (mounted) {
          setIsAvailable(response.ok);
          console.log('Backend status set to:', response.ok);
        }
      } catch (error) {
        console.error('Backend check failed:', error);
        if (mounted) {
          setIsAvailable(false);
        }
      } finally {
        if (mounted) {
          setIsChecking(false);
        }
      }
    };

    // Initial check
    checkStatus();

    // Schedule periodic checks
    const intervalId = setInterval(checkStatus, checkInterval);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [checkInterval]);

  return { isAvailable, isChecking };
}