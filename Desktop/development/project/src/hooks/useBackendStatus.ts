import { useState, useEffect } from 'react';
import { backendService } from '../services/backend/serviceManager';
import { BACKEND_CONFIG } from '../services/backend/config';
import { retry } from '../utils/retry';

export function useBackendStatus(checkInterval = BACKEND_CONFIG.HEALTH_CHECK_INTERVAL) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number;

    const checkStatus = async () => {
      try {
        setIsChecking(true);
        const status = await retry(
          () => backendService.checkService(),
          {
            attempts: 2,
            delay: BACKEND_CONFIG.RETRY_DELAY,
          }
        );
        
        if (mounted) {
          setIsAvailable(status);
        }
      } catch (error) {
        if (mounted) {
          setIsAvailable(false);
        }
      } finally {
        if (mounted) {
          setIsChecking(false);
        }
      }
    };

    const scheduleNextCheck = () => {
      timeoutId = window.setTimeout(async () => {
        await checkStatus();
        scheduleNextCheck();
      }, checkInterval);
    };

    checkStatus().then(() => {
      if (mounted) {
        scheduleNextCheck();
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [checkInterval]);

  return { isAvailable, isChecking };
}