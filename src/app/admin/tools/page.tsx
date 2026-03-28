'use client';

import { useState } from 'react';
import { BackupRestore } from '@/components/admin/BackupRestore';
import { MigrationTool } from '@/components/admin/MigrationTool';
import { UserManagement } from '@/components/admin/UserManagement';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function AdminToolsPage() {
    const [processStatus, setProcessStatus] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isKilling, setIsKilling] = useState(false);
    const [isKillModalOpen, setIsKillModalOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [projectId, setProjectId] = useState('');
    const [perfProjectId, setPerfProjectId] = useState('');
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [message, setMessage] = useState('');
    const [defaultDuration, setDefaultDuration] = useState<number>(1);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/admin/config');
            const data = await res.json();
            if (data.defaultDuration) setDefaultDuration(data.defaultDuration);
        } catch (error) {
            console.error('Failed to fetch config');
        }
    };

    useState(() => {
        fetchConfig();
    });

    const handleSaveConfig = async () => {
        setIsSavingConfig(true);
        setMessage('');
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ defaultDuration }),
            });
            const data = await res.json();
            setMessage(data.success ? '✅ Global settings saved' : `❌ ${data.error}`);
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setIsSavingConfig(false);
        }
    };

    const checkProcesses = async () => {
        setIsLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/admin/process-status');
            const data = await res.json();
            setProcessStatus(data);
            setMessage(`Found ${data.processes.total} active render process(es)`);
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const killAllRenders = async () => {
        setIsKillModalOpen(true);
    };

    const confirmKillAll = async () => {
        setIsKillModalOpen(false);
        setIsKilling(true);
        setMessage('');
        try {
            const res = await fetch('/api/admin/kill-renders', { method: 'POST' });
            const data = await res.json();
            setMessage(data.success ? '✅ All render processes terminated' : `❌ ${data.error}`);
            // Refresh status after killing
            setTimeout(checkProcesses, 1000);
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setIsKilling(false);
        }
    };

    const handleResetProject = async () => {
        if (!projectId) {
            setMessage('❌ Please enter a Project ID');
            return;
        }

        setIsResetting(true);
        setMessage('');
        try {
            const res = await fetch('/api/admin/reset-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });
            const data = await res.json();
            setMessage(data.success ? `✅ Project ${projectId} reset successfully` : `❌ ${data.error}`);
            if (data.success) setProjectId('');
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setIsResetting(false);
        }
    };

    const handleConfigPerformance = async (mode: 'standard' | 'turbo') => {
        if (!perfProjectId) {
            setMessage('❌ Please enter a Project ID for performance config');
            return;
        }

        setIsConfiguring(true);
        setMessage('');
        try {
            const res = await fetch('/api/admin/config-performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: perfProjectId,
                    performanceProfile: { mode }
                }),
            });
            const data = await res.json();
            setMessage(data.success ? `🚀 Project ${perfProjectId} set to ${mode.toUpperCase()} mode` : `❌ ${data.error}`);
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setIsConfiguring(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 pt-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">🛠️ Admin Tools</h1>
                            <p className="text-slate-400">Monitor and manage render processes</p>
                        </div>
                        <button
                            onClick={checkProcesses}
                            disabled={isLoading}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            {isLoading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    SYTEM_CHECKING...
                                </>
                            ) : (
                                <>
                                    🔍 SYSTEM_HEAD_CHECK
                                </>
                            )}
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={killAllRenders}
                            disabled={isKilling}
                            className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg font-bold transition-all flex items-center gap-2"
                        >
                            {isKilling ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    Killing...
                                </>
                            ) : (
                                <>
                                    ⚠️ Kill All Renders
                                </>
                            )}
                        </button>

                        <a
                            href="/admin/projects"
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-600/80 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/10 active:scale-95"
                        >
                            🌐 Global Projects
                        </a>

                        <a
                            href="/admin/research/personas"
                            className="px-6 py-3 bg-slate-700 hover:bg-slate-700/80 text-white rounded-lg font-bold transition-all flex items-center gap-2 active:scale-95"
                        >
                            🤖 Research Personas
                        </a>

                        <a
                            href="/admin/credits"
                            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg shadow-amber-500/10 active:scale-95"
                        >
                            💰 Credit Management
                        </a>

                        <a
                            href="/"
                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white border border-white/10 rounded-lg font-bold transition-all flex items-center gap-2 active:scale-95 ml-auto"
                        >
                            🏠 Return to Home
                        </a>
                    </div>
                    
                    {/* Message Display */}
                    {message && (
                        <div className={`p-4 rounded-lg mb-6 ${message.includes('Error') || message.includes('❌')
                            ? 'bg-red-900/20 border border-red-500/30 text-red-300'
                            : 'bg-green-900/20 border border-green-500/30 text-green-300'
                            }`}>
                            {message}
                        </div>
                    )}

                    {/* Global Product Settings */}
                    <div className="bg-slate-700/20 rounded-xl p-6 border border-white/5 mb-8">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            ⚙️ Global Product Settings
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Default Project Duration (Minutes)
                                </label>
                                <div className="flex gap-4">
                                    <input
                                        type="number"
                                        value={defaultDuration || ''}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setDefaultDuration(isNaN(val) ? 0 : val);
                                        }}
                                        className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                    <button
                                        onClick={handleSaveConfig}
                                        disabled={isSavingConfig}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-500/10"
                                    >
                                        {isSavingConfig ? 'Saving...' : 'Save Meta Settings'}
                                    </button>
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-500 italic pb-2 leading-relaxed">
                                This setting determines the initial duration for all new projects. Users can still manually adjust duration within individual project settings after creation.
                            </div>
                        </div>
                    </div>

                    {/* User Management Section */}
                    <div className="mb-8">
                        <UserManagement />
                    </div>

                    {/* Reset Project Section */}
                    <div className="bg-slate-700/20 rounded-xl p-6 border border-white/5 mb-8">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            🔄 Reset Stuck Project
                        </h2>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                placeholder="Enter Project ID (e.g. j1k2l3...)"
                                className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                            <button
                                onClick={handleResetProject}
                                disabled={isResetting || !projectId}
                                className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white rounded-lg font-bold transition-all flex items-center gap-2"
                            >
                                {isResetting ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                        Resetting...
                                    </>
                                ) : (
                                    <>Reset Project</>
                                )}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-3 italic">
                            This will force a project back to "Assembling" status and clear the hung render progress.
                        </p>
                    </div>
                    
                    {/* User Credit Management Link Card */}
                    <div className="bg-slate-700/20 rounded-xl p-8 border border-amber-500/20 mb-8 flex flex-col md:flex-row items-center justify-between gap-8 group">
                        <div className="space-y-4">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                💰 Billing & Credit Nexus
                            </h2>
                            <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
                                Access global liquidity oversight, tier overrides, and transaction auditing for all personnel. 
                                Standard single-user top-up operations have been migrated to this consolidated dashboard.
                            </p>
                        </div>
                        <a 
                            href="/admin/credits"
                            className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-amber-600/20 transition-all group-hover:scale-105"
                        >
                            Enter Management Hub
                        </a>
                    </div>

                    {/* System Backup & Restore */}
                    <div className="bg-slate-700/20 rounded-xl p-6 border border-amber-500/20 mb-8">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            💾 System Backup & Restore
                        </h2>
                        <p className="text-slate-400 text-sm mb-4">
                            Create a full system backup or restore from a previous backup. System backups include all users, projects, scripts, topics, and settings.
                        </p>
                        <BackupRestore type="system" />
                    </div>

                    {/* System Migration Area */}
                    <div className="bg-slate-700/20 rounded-xl p-6 border border-purple-500/20 mb-8">
                        <MigrationTool />
                    </div>

                    {/* Performance Control Section */}
                    <div className="bg-slate-700/20 rounded-xl p-6 border border-white/5 mb-8">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            🚀 Performance Control (Turbo Mode)
                        </h2>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    value={perfProjectId}
                                    onChange={(e) => setPerfProjectId(e.target.value)}
                                    placeholder="Enter Project ID"
                                    className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleConfigPerformance('standard')}
                                        disabled={isConfiguring || !perfProjectId}
                                        className="px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-30 text-white rounded-lg font-bold transition-all"
                                    >
                                        Standard
                                    </button>
                                    <button
                                        onClick={() => handleConfigPerformance('turbo')}
                                        disabled={isConfiguring || !perfProjectId}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/20 transition-all border border-indigo-400/50"
                                    >
                                        🔥 TURBO
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-[10px] text-slate-400 bg-slate-900/30 p-2 rounded border border-white/5">
                                    <p className="font-bold text-slate-300 mb-1">STANDARD MODE</p>
                                    <ul className="list-disc list-inside">
                                        <li>Sequential Synthesis (12s delay)</li>
                                        <li>Low CPU Priority</li>
                                        <li>Safer for Quotas</li>
                                    </ul>
                                </div>
                                <div className="text-[10px] text-blue-400 bg-blue-900/10 p-2 rounded border border-blue-500/20">
                                    <p className="font-bold text-blue-300 mb-1">TURBO MODE</p>
                                    <ul className="list-disc list-inside">
                                        <li>Parallel Synthesis (3 concurrent)</li>
                                        <li>Reduced delays (2s)</li>
                                        <li>High-resource allocation</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Process Status Display */}
                    {processStatus && (
                        <div className="space-y-6">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-700/30 p-4 rounded-lg border border-white/5">
                                    <div className="text-slate-400 text-sm mb-1">Status</div>
                                    <div className={`text-2xl font-bold ${processStatus.status === 'IDLE' ? 'text-green-400' : 'text-yellow-400'
                                        }`}>
                                        {processStatus.status}
                                    </div>
                                </div>
                                <div className="bg-slate-700/30 p-4 rounded-lg border border-white/5">
                                    <div className="text-slate-400 text-sm mb-1">FFmpeg Processes</div>
                                    <div className="text-2xl font-bold text-white">
                                        {processStatus.processes.ffmpeg.count}
                                    </div>
                                </div>
                                <div className="bg-slate-700/30 p-4 rounded-lg border border-white/5">
                                    <div className="text-slate-400 text-sm mb-1">Compositor Processes</div>
                                    <div className="text-2xl font-bold text-white">
                                        {processStatus.processes.compositor.count}
                                    </div>
                                </div>
                            </div>

                            {/* System Resources */}
                            {processStatus.system.memory && (
                                <div className="bg-slate-700/30 p-4 rounded-lg border border-white/5">
                                    <h3 className="text-white font-bold mb-3">Memory Usage</h3>
                                    <div className="grid grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <div className="text-slate-400">Total</div>
                                            <div className="text-white font-mono">{processStatus.system.memory.total} MB</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-400">Used</div>
                                            <div className="text-white font-mono">{processStatus.system.memory.used} MB</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-400">Free</div>
                                            <div className="text-white font-mono">{processStatus.system.memory.free} MB</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-400">Available</div>
                                            <div className="text-white font-mono">{processStatus.system.memory.available} MB</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Process Details */}
                            {processStatus.processes.ffmpeg.count > 0 && (
                                <div className="bg-slate-700/30 p-4 rounded-lg border border-white/5">
                                    <h3 className="text-white font-bold mb-3">Active FFmpeg Processes</h3>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {processStatus.processes.ffmpeg.details.map((proc: string, idx: number) => (
                                            <div key={idx} className="text-xs font-mono text-slate-300 bg-slate-900/50 p-2 rounded">
                                                {proc}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Timestamp */}
                            <div className="text-xs text-slate-500 text-center">
                                Last checked: {new Date(processStatus.timestamp).toLocaleString()}
                            </div>
                        </div>
                    )}
                </div>
                <ConfirmModal
                    isOpen={isKillModalOpen}
                    onClose={() => setIsKillModalOpen(false)}
                    onConfirm={confirmKillAll}
                    title="Terminate All Renders?"
                    message="⚠️ This will forcibly terminate ALL active render processes. This is a destructive action and may result in corrupted media files for projects currently rendering."
                    confirmLabel="YES, KILL ALL"
                    isDestructive={true}
                />
            </div>
        </div>
    );
}
