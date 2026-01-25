'use client';

import { useState, useEffect } from 'react';
import { EnvironmentMode, getConfig, EnvironmentConfig } from '../config/environment';

/**
 * Client-side hook to get the current environment mode from cookies
 * This ensures the UI reflects the user's environment selection
 */
export function useEnvironment() {
    const [mode, setMode] = useState<EnvironmentMode>('DEV');
    const [config, setConfig] = useState<EnvironmentConfig>(getConfig('DEV'));

    useEffect(() => {
        // Read from cookie
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('x-env-mode='))
            ?.split('=')[1] as EnvironmentMode | undefined;

        const effectiveMode = cookieValue ||
            (process.env.NEXT_PUBLIC_ENV_MODE as EnvironmentMode) ||
            'DEV';

        setMode(effectiveMode);
        setConfig(getConfig(effectiveMode));
    }, []);

    return { mode, config };
}
