'use client';

import { useState, useEffect } from 'react';

export interface SovereignStatus {
    gated: boolean;
    status: 'red' | 'amber' | 'green';
    message?: string;
    breachedPolicySlug?: string;
    loading: boolean;
    error: boolean;
}

/**
 * Hook to monitor the Sovereign Compliance status of the suite.
 * Polls the local compliance API to ensure real-time enforcement of GATT states.
 */
export function useSovereignStatus() {
    const [status, setStatus] = useState<SovereignStatus>({
        gated: false,
        status: 'green',
        loading: true,
        error: false
    });

    const checkStatus = async () => {
        try {
            const res = await fetch('/api/compliance/sovereign');
            const data = await res.json();

            // Resilient check for gated status
            setStatus({
                gated: !!data.gated,
                status: data.status || (data.gated ? 'red' : 'green'),
                message: data.message,
                breachedPolicySlug: data.breachedPolicySlug,
                loading: false,
                error: false
            });
        } catch (err) {
            console.error('[useSovereignStatus] Failed to fetch compliance state:', err);
            setStatus(prev => ({ ...prev, loading: false, error: true }));
        }
    };

    useEffect(() => {
        checkStatus();
        
        // Poll every 60 seconds to catch registry drifts (relaxed polling for VideoSystem)
        const interval = setInterval(checkStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    return status;
}
