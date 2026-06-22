import { useState, useEffect, useCallback } from 'react';
import { BMSPollService, type BMSPollStatus } from '@/services/BMSPollService';

export interface BMSPollingState extends BMSPollStatus {
  isPolling: boolean;
  triggerNow: () => Promise<void>;
  formatNextPoll: () => string;
  formatLastPoll: () => string;
}

export function useBMSPolling(): BMSPollingState {
  const [status, setStatus] = useState<BMSPollStatus>(BMSPollService.getStatus());

  useEffect(() => {
    const handler = () => setStatus(BMSPollService.getStatus());
    window.addEventListener('nexum_bms_poll_update', handler);
    // Also refresh on focus so status stays current after tab switch
    window.addEventListener('focus', handler);
    return () => {
      window.removeEventListener('nexum_bms_poll_update', handler);
      window.removeEventListener('focus', handler);
    };
  }, []);

  const triggerNow = useCallback(async () => {
    await BMSPollService.triggerNow();
  }, []);

  const formatNextPoll = useCallback((): string => {
    const { nextPollAt } = status;
    if (!nextPollAt) return 'Not scheduled';
    const diff = new Date(nextPollAt).getTime() - Date.now();
    if (diff <= 0) return 'Imminent';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h > 0) return `in ${h}h ${m}m`;
    return `in ${m}m`;
  }, [status]);

  const formatLastPoll = useCallback((): string => {
    const { lastPolledAt } = status;
    if (!lastPolledAt) return 'Never';
    const diff = Date.now() - new Date(lastPolledAt).getTime();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h >= 24) return `${Math.floor(h / 24)}d ago`;
    if (h > 0) return `${h}h ${m}m ago`;
    if (m > 0) return `${m}m ago`;
    return 'Just now';
  }, [status]);

  return {
    ...status,
    isPolling: status.status === 'polling',
    triggerNow,
    formatNextPoll,
    formatLastPoll,
  };
}
