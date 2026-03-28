'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface HealthCheckResult {
    service: string;
    status: 'operational' | 'degraded' | 'down';
    responseTime: number;
    message?: string;
    lastChecked: string;
}

interface HealthResponse {
    cached: boolean;
    cacheAge: number;
    results: HealthCheckResult[];
}

export default function HealthDashboard() {
    const [healthData, setHealthData] = useState<HealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchHealth = async () => {
        try {
            setError(null);
            const response = await fetch('/api/health');
            if (!response.ok) throw new Error('Failed to fetch health status');
            const data = await response.json();
            setHealthData(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
    }, []);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchHealth, 60000); // Refresh every 60 seconds
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'operational': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'degraded': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'down': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'operational': return '✓';
            case 'degraded': return '⚠';
            case 'down': return '✗';
            default: return '?';
        }
    };

    const getServiceIcon = (service: string) => {
        if (service.includes('Vertex')) return '🧠';
        if (service.includes('TTS')) return '🎙️';
        if (service.includes('Firestore')) return '🔥';
        if (service.includes('YouTube')) return '📺';
        if (service.includes('Storage')) return '💾';
        if (service.includes('Local System')) return '💻';
        return '🔧';
    };

    const overallStatus = healthData?.results.every(r => r.status === 'operational') ? 'operational' :
        healthData?.results.some(r => r.status === 'down') ? 'down' : 'degraded';

    const localSystem = healthData?.results.find(r => r.service.includes('Local System'));
    const isWslOverloaded = localSystem && localSystem.status !== 'operational';

    // Component for individual health check card
    const HealthCard = ({ result }: { result: HealthCheckResult }) => (
        <div
            className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{getServiceIcon(result.service)}</span>
                    <div>
                        <h3 className="font-bold text-white/90">{result.service}</h3>
                        <p className="text-xs text-white/40 mt-0.5">
                            {new Date(result.lastChecked).toLocaleTimeString()}
                        </p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(result.status)}`}>
                    {getStatusIcon(result.status)} {result.status.toUpperCase()}
                </span>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-white/60">Response Time</span>
                    <span className={`font-mono font-bold ${result.responseTime < 2000 ? 'text-green-400' :
                        result.responseTime < 5000 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                        {result.responseTime}ms
                    </span>
                </div>
                {result.message && (
                    <p className="text-xs text-white/50 italic border-t border-white/5 pt-2 mt-2">
                        {result.message}
                    </p>
                )}
            </div>
        </div>
    );

    return (

        <ProtectedRoute>
            <div className="min-h-screen bg-slate-950 text-white p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/"
                                className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all group"
                                title="Return to Dashboard"
                            >
                                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-600">
                                    System Health Monitor
                                </h1>
                                <p className="text-white/60 text-sm mt-1">Real-time status of all critical services</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800/50">
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${autoRefresh
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'bg-slate-800 text-slate-400'
                                    }`}
                            >
                                {autoRefresh ? '● Auto-Refresh On' : '○ Auto-Refresh Off'}
                            </button>
                            <button
                                onClick={() => {
                                    setLoading(true);
                                    fetchHealth();
                                }}
                                disabled={loading}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-700/50"
                            >
                                {loading ? '⏳ Checking...' : '🔄 Refresh Now'}
                            </button>
                        </div>
                    </div>

                    {/* Overall Status Banner */}
                    {healthData && (
                        <div className={`p-6 rounded-2xl border ${getStatusColor(overallStatus)} flex items-center justify-between`}>
                            <div className="flex items-center gap-4">
                                <div className="text-4xl">{getStatusIcon(overallStatus)}</div>
                                <div>
                                    <h2 className="text-xl font-bold capitalize">
                                        {overallStatus === 'operational' ? 'All Systems Operational' :
                                            isWslOverloaded ? 'System Pressure High' : 'Service Issues Detected'}
                                    </h2>
                                    <p className="text-sm opacity-80">
                                        {isWslOverloaded
                                            ? 'WSL/Host resources are limited. Throttling active to prevent crashes.'
                                            : `${healthData.results.filter(r => r.status === 'operational').length} of ${healthData.results.length} services operational`}
                                    </p>
                                </div>
                            </div>
                            {healthData.cached && (
                                <div className="text-xs opacity-60">
                                    Cached ({healthData.cacheAge}s ago)
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl">
                            <p className="text-red-400">⚠️ {error}</p>
                        </div>
                    )}

                    {/* Services Sections */}
                    {loading && !healthData ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-500">Running health checks...</p>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {/* API Status Section */}
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-blue-500/80">API Status</h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-blue-500/20 to-transparent"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {healthData?.results
                                        .filter(r => r.service.includes('Vertex') || r.service.includes('TTS') || r.service.includes('YouTube'))
                                        .map((result) => (
                                            <HealthCard key={result.service} result={result} />
                                        ))}
                                </div>
                            </section>

                            {/* System Status Section */}
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-green-500/80">System Status</h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-green-500/20 to-transparent"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {healthData?.results
                                        .filter(r => r.service.includes('Firestore') || r.service.includes('Storage') || r.service.includes('Local System'))
                                        .map((result) => (
                                            <HealthCard key={result.service} result={result} />
                                        ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Info Footer */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-white/60">
                            Health checks run every 60 seconds. Results are cached to minimize API usage.
                        </p>
                        <Link
                            href="/"
                            className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2"
                        >
                            <span>← Return to Dashboard</span>
                        </Link>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
