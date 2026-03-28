'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { EnvironmentMode, EnvironmentConfig, getConfig } from '../config/environment';

interface EnvironmentContextType {
    mode: EnvironmentMode;
    config: EnvironmentConfig;
    setMode: (mode: EnvironmentMode) => void;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

export function EnvironmentProvider({ children, initialMode = 'DEV' }: { children: ReactNode; initialMode?: EnvironmentMode }) {
    const [mode, setModeState] = useState<EnvironmentMode>(initialMode);
    const [config, setConfig] = useState<EnvironmentConfig>(getConfig(initialMode));

    useEffect(() => {
        // Initial sync with cookie in case it changed server-side
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('x-env-mode='))
            ?.split('=')[1] as EnvironmentMode | undefined;
            
        if (cookieValue && cookieValue !== mode) {
            setModeState(cookieValue);
            setConfig(getConfig(cookieValue));
        }
    }, [mode]);

    const setMode = (newMode: EnvironmentMode) => {
        if (newMode === mode) return;
        setModeState(newMode);
        setConfig(getConfig(newMode));
        document.cookie = `x-env-mode=${newMode}; path=/; max-age=31536000; SameSite=Lax`;
    };

    return (
        <EnvironmentContext.Provider value={{ mode, config, setMode }}>
            {children}
        </EnvironmentContext.Provider>
    );
}

export function useEnvironmentContext() {
    const context = useContext(EnvironmentContext);
    if (context === undefined) {
        throw new Error('useEnvironmentContext must be used within an EnvironmentProvider');
    }
    return context;
}
