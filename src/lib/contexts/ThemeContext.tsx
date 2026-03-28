'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'intel' | 'saas' | 'cyber' | 'midnight' | 'stealth' | 'smart-casual';

interface ThemeContextType {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, initialTheme = 'saas' }: { children: React.ReactNode, initialTheme?: ThemeMode }) {
    const [theme, setThemeState] = useState<ThemeMode>(initialTheme);

    const setTheme = (newTheme: ThemeMode) => {
        setThemeState(newTheme);
        // Persist theme choice in a cookie
        document.cookie = `x-theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
        
        // Apply class to document element for immediate CSS response
        const root = window.document.documentElement;
        root.className = root.className.replace(/\btheme-\S+/g, '');
        root.classList.add(`theme-${newTheme}`);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
