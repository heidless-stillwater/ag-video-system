'use client';

import React from 'react';
import Link from 'next/link';
import { EnvironmentSelector } from './EnvironmentSelector';
import { AuthButton } from '@/components/auth/AuthButton';
import { EnvironmentMode } from '@/lib/config/environment';

interface HeaderProps {
    initialMode?: EnvironmentMode;
}

export const Header = ({ initialMode }: HeaderProps) => {
    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-black/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-50">
            <div className="flex items-center gap-8">
                <Link href="/" className="text-white font-bold tracking-tight text-lg hover:opacity-80 transition-opacity">
                    VideoSystem <span className="text-blue-500">.ai</span>
                </Link>

                <nav className="flex items-center gap-4 text-sm text-white/60">
                    <Link href="/projects/new" className="hover:text-white transition-colors">New Project</Link>
                    <Link href="/topics" className="hover:text-white transition-colors">Topics</Link>
                </nav>
            </div>

            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/health"
                    className="p-2 text-white/40 hover:text-green-400 transition-colors"
                    title="System Health"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </Link>
                <div className="h-6 w-px bg-white/10"></div>
                <EnvironmentSelector initialMode={initialMode} />
                <div className="h-6 w-px bg-white/10"></div>
                <AuthButton />
            </div>
        </header>
    );
};
