'use client';

import React, { useEffect, useState } from 'react';
import { fetchUsageLogs } from '@/app/actions/analytics';
import { UsageLog } from '@/types';
import { useAuth } from '@/lib/auth/AuthContext';

export default function AnalyticsDashboard() {
    const { user } = useAuth();
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const data = await fetchUsageLogs(user.id);
            setLogs(data);
            setLoading(false);
        };
        load();
    }, [user]);

    const totalCredits = logs.reduce((sum, log) => sum + (log.creditsDeducted || 0), 0);

    const byService = logs.reduce((acc, log) => {
        acc[log.service] = (acc[log.service] || 0) + (log.creditsDeducted || 0);
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                    Performance & Cost Analytics
                </h1>
                <p className="text-white/60 mt-2">Real-time tracking of AI token usage and infrastructure costs.</p>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KpiCard title="Total Credits Used" value={totalCredits.toFixed(2)} icon="💎" />
                <KpiCard title="API Calls Traced" value={logs.length.toString()} icon="📡" />
                <KpiCard title="Vertex AI Credits" value={(byService['vertex-ai'] || 0).toFixed(2)} icon="🧠" />
                <KpiCard title="Rendering Credits" value={(byService['render'] || 0).toFixed(2)} icon="🎬" />
            </div>

            {/* Recent Logs Table */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white/90">Recent Activity Log</h2>
                    <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">Live Sync</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-white/60">
                        <thead className="bg-white/5 text-white/80 uppercase font-bold text-xs tracking-wider">
                            <tr>
                                <th className="p-4">Time</th>
                                <th className="p-4">Service</th>
                                <th className="p-4">Operation</th>
                                <th className="p-4">Model</th>
                                <th className="p-4">Input/Dur</th>
                                <th className="p-4">Latency</th>
                                <th className="p-4 text-right">Credits</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center">Loading telemetry...</td></tr>
                            ) : logs.map((log) => (
                                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-mono text-xs">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '-'}</td>
                                    <td className="p-4">
                                        <ServiceBadge service={log.service} />
                                    </td>
                                    <td className="p-4 text-white/80">{log.operation}</td>
                                    <td className="p-4 font-mono text-xs opacity-70">{log.model}</td>
                                    <td className="p-4 font-mono text-xs">{log.inputCount.toLocaleString()}</td>
                                    <td className="p-4 font-mono text-xs text-yellow-500/80">{log.executionTimeMs}ms</td>
                                    <td className="p-4 text-right font-mono text-green-400/90">{log.creditsDeducted.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const KpiCard = ({ title, value, icon }: { title: string, value: string, icon: string }) => (
    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col gap-2 relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 text-6xl opacity-5 group-hover:opacity-10 transition-opacity grayscale">{icon}</div>
        <span className="text-white/40 text-xs font-bold uppercase tracking-wider">{title}</span>
        <span className="text-3xl font-light text-white/90">{value}</span>
    </div>
);

const ServiceBadge = ({ service }: { service: string }) => {
    const colors: Record<string, string> = {
        'vertex-ai': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        'google-tts': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        'render': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        'storage': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    };
    return (
        <span className={`px-2 py-1 rounded text-xs font-medium border ${colors[service] || 'bg-white/10 text-white/50'}`}>
            {service}
        </span>
    );
};
