'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeMode } from '@/lib/contexts/ThemeContext';

const themes: { id: ThemeMode; name: string; icon: string; desc: string; color: string }[] = [
    { id: 'saas', name: 'Modern SaaS', icon: '💎', desc: 'Clean, glassmorphic, friendly', color: 'bg-indigo-500' },
    { id: 'intel', name: 'Intelligence', icon: '🔍', desc: 'Station command, high-tech', color: 'bg-blue-500' },
    { id: 'cyber', name: 'Neon Cyber', icon: '🔋', desc: 'Terminal green, high-contrast', color: 'bg-emerald-500' },
    { id: 'midnight', name: 'Midnight', icon: '🌙', desc: 'Calm navy, sleep optimized', color: 'bg-slate-700' },
    { id: 'stealth', name: 'Pure Stealth', icon: '🌑', desc: 'Monochrome, minimal noise', color: 'bg-zinc-800' },
    { id: 'smart-casual', name: 'Smart/Casual', icon: '🛠️', desc: 'Admin style, pragmatic', color: 'bg-blue-600' },
];

export function ThemeSelector() {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentTheme = themes.find(t => t.id === theme) || themes[0];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-white/5 transition-all"
                title="Change Theme"
            >
                <span className="text-sm">{currentTheme.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 hidden sm:block">Theme</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-white/5 bg-slate-800/50">
                        <span className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase italic">Visual_Protocol</span>
                    </div>
                    <div className="p-2 space-y-1">
                        {themes.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setTheme(t.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${
                                    theme === t.id 
                                        ? 'bg-blue-600/10 border border-blue-500/20' 
                                        : 'hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-lg ${t.color} flex items-center justify-center text-sm shadow-lg`}>
                                    {t.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-black uppercase tracking-tight ${theme === t.id ? 'text-blue-400' : 'text-slate-200'}`}>
                                            {t.name}
                                        </span>
                                        {theme === t.id && <span className="text-blue-400 text-[10px]">●</span>}
                                    </div>
                                    <p className="text-[10px] text-slate-500 lowercase italic">{t.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
