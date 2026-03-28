'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EnvironmentMode } from '@/lib/config/environment';

interface EnvironmentSelectorProps {
    initialMode?: EnvironmentMode;
}

export const EnvironmentSelector = ({ initialMode = 'DEV' }: EnvironmentSelectorProps) => {
    const router = useRouter();
    const [mode, setMode] = useState<EnvironmentMode>(initialMode);

    // Sync with cookie on mount
    useEffect(() => {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('x-env-mode='))
            ?.split('=')[1] as EnvironmentMode | undefined;

        if (cookieValue && cookieValue !== mode) {
            setMode(cookieValue);
        }
    }, []);

    const handleChange = async (newMode: EnvironmentMode) => {
        setMode(newMode);
        // Set cookie
        document.cookie = `x-env-mode=${newMode}; path=/; max-age=31536000; SameSite=Lax`;
        
        // Dispatch custom event for client-side hooks
        window.dispatchEvent(new CustomEvent('envModeChanged'));
        
        // Refresh to apply changes server-side if needed (Next.js server components)
        router.refresh();
        
        // Removed window.location.reload() for dynamic propagation
    };

    return (
        <div className="flex items-center gap-2 text-xs font-mono bg-neutral-900 border border-white/10 rounded-full px-3 py-1">
            <span className="text-white/40 uppercase">Env:</span>
            <select
                value={mode}
                onChange={(e) => handleChange(e.target.value as EnvironmentMode)}
                className="bg-transparent text-blue-400 font-bold outline-none cursor-pointer uppercase [&>option]:bg-neutral-900 [&>option]:text-white"
            >
                <option value="DEV">DEV (Mock)</option>
                <option value="STAGING">STAGING (Real AI)</option>
                <option value="STAGING_LIMITED">STAGING (Limit AI)</option>
                <option value="PRODUCTION">PRODUCTION</option>
            </select>
            <div className={`w-2 h-2 rounded-full ${mode === 'DEV' ? 'bg-green-500' : mode === 'PRODUCTION' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
        </div>
    );
};
