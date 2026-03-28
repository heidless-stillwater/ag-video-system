'use client';

import React from 'react';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { ThemeProvider, ThemeMode } from '@/lib/contexts/ThemeContext';
import { EnvironmentProvider } from '@/lib/contexts/EnvironmentContext';
import { EnvironmentMode } from '@/lib/config/environment';

export function Providers({ 
    children, 
    initialTheme = 'saas',
    initialMode = 'DEV'
}: { 
    children: React.ReactNode, 
    initialTheme?: ThemeMode,
    initialMode?: EnvironmentMode
}) {
    return (
        <ThemeProvider initialTheme={initialTheme}>
            <EnvironmentProvider initialMode={initialMode}>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </EnvironmentProvider>
        </ThemeProvider>
    );
}
