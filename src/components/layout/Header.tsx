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

            <div className="flex items-center gap-2">
                <Link
                    href="/admin/tools"
                    className="p-2 text-white/40 hover:text-blue-400 transition-colors"
                    title="Admin Tools"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </Link>
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
