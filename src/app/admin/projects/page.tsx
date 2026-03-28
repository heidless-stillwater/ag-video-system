'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Project, UserPlan, ProjectStatus } from '@/types';
import Link from 'next/link';

interface EnrichedProject extends Project {
    user: {
        email: string;
        displayName: string;
    }
}

function AdminProjectsContent() {
    const { firebaseUser, authFetch } = useAuth();
    const [projects, setProjects] = useState<EnrichedProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (firebaseUser) {
            fetchProjects();
        }
    }, [firebaseUser, authFetch]);

    const fetchProjects = async () => {
        if (!firebaseUser) return;
        setLoading(true);
        try {
            const res = await authFetch('/api/admin/projects');
            const data = await res.json();
            if (data.success) {
                setProjects(data.projects);
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: ProjectStatus) => {
        switch (status) {
            case 'published': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'rendering': return 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse';
            case 'ready': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const filteredProjects = projects.filter(p => {
        const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
        const matchesSearch =
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.user.displayName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const activeRendersCount = projects.filter(p => p.status === 'rendering').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 pt-24">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">🌐 Global Projects</h1>
                        <p className="text-slate-400">Monitor all documentary projects across the system</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 bg-slate-800/50 rounded-xl border border-white/10 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-slate-300 text-sm font-medium">
                                {activeRendersCount} Active Render{activeRendersCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <button
                            onClick={fetchProjects}
                            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            title="Refresh"
                        >
                            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 mb-6 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search projects or users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-all"
                        />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="rendering">Rendering</option>
                        <option value="ready">Ready</option>
                        <option value="published">Published</option>
                        <option value="failed">Failed</option>
                        <option value="draft">Draft</option>
                    </select>

                    <Link
                        href="/admin/tools"
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors text-center"
                    >
                        Admin Tools
                    </Link>
                </div>

                {/* Message */}
                {message && (
                    <div className={`p-4 rounded-xl mb-6 ${message.includes('❌') ? 'bg-red-900/20 border border-red-500/30 text-red-300' : 'bg-green-900/20 border border-green-500/30 text-green-300'}`}>
                        {message}
                    </div>
                )}

                {/* Projects Grid */}
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-400">Fetching the collective output...</p>
                    </div>
                ) : (
                    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/10">
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Project</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Credits / Duration</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredProjects.map((p) => (
                                        <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold group-hover:text-blue-400 transition-colors">{p.title}</span>
                                                    <span className="text-slate-500 text-xs font-mono mt-1">{p.id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-300 text-sm font-medium">{p.user.displayName}</span>
                                                    <span className="text-slate-500 text-xs">{p.user.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border w-fit ${getStatusColor(p.status)}`}>
                                                        {p.status}
                                                    </span>
                                                    {(p.status === 'rendering' || p.status === 'generating_media') && (
                                                        <div className="w-24 h-1 bg-slate-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500 transition-all duration-500"
                                                                style={{ width: `${p.renderProgress || p.mediaProgress || 0}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-emerald-400 text-sm font-mono">{p.creditsDeducted?.toFixed(2) || '0.00'} 💎</span>
                                                    <span className="text-slate-400 text-xs">{p.estimatedDuration} mins</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/projects/${p.id}`}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-all"
                                                >
                                                    View Details
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredProjects.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                                                No projects found matching the criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Summary bar */}
                <div className="mt-6 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 bg-slate-800/30 rounded-xl p-4 border border-white/5">
                        <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">Total System Projects</span>
                        <div className="text-2xl font-bold text-white mt-1">{projects.length}</div>
                    </div>
                    <div className="flex-1 bg-slate-800/30 rounded-xl p-4 border border-white/5">
                        <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">Total System Credits Used</span>
                        <div className="text-2xl font-bold text-emerald-400 mt-1">
                            {projects.reduce((acc, p) => acc + (p.creditsDeducted || 0), 0).toFixed(2)} 💎
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AdminProjectsPage() {
    return (
        <RoleGuard requiredRoles={['su', 'admin']}>
            <AdminProjectsContent />
        </RoleGuard>
    );
}
