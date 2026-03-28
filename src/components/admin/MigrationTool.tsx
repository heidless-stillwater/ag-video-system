'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { setConnectionOverride, clearConnectionOverride, getConnectionOverride } from '@/lib/config/connectionManager';

import { ConfirmModal } from '@/components/ui/ConfirmModal';

export function MigrationTool() {
    const { authFetch, isAdmin, isSuperUser } = useAuth();
    const [targetServiceAccount, setTargetServiceAccount] = useState('');
    const [targetFirebaseConfig, setTargetFirebaseConfig] = useState('');
    const [targetDatabaseId, setTargetDatabaseId] = useState('autovideo-db-0');

    const [isMigrating, setIsMigrating] = useState(false);
    const [message, setMessage] = useState('');
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [activeOverride, setActiveOverride] = useState(getConnectionOverride());

    // Modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [validatedConfig, setValidatedConfig] = useState<{ sa: any, config: any } | null>(null);
    const [statusModal, setStatusModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

    const safeJson = async (res: Response) => {
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            return { error: text || res.statusText || 'Unknown server error' };
        }
    };

    const tryParseJson = (input: string, label: string) => {
        try {
            // First try standard parse
            return JSON.parse(input);
        } catch (e) {
            try {
                // Try to fix common copy-paste issues (unquoted keys)
                // This regex looks for word characters followed by a colon and wraps them in quotes
                const fixed = input.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
                return JSON.parse(fixed);
            } catch (e2) {
                throw new Error(`${label} is not valid JSON. Please ensure keys are quoted.`);
            }
        }
    };

    const executeMigration = async (dryRun: boolean, sa: any, config: any) => {
        setIsMigrating(true);
        setMessage('');
        setProgress(0);
        setStatus(dryRun ? 'Validating connection...' : 'Initializing migration...');

        try {
            const response = await authFetch('/api/admin/migrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetServiceAccount: JSON.stringify(sa),
                    targetFirebaseConfig: JSON.stringify(config),
                    targetDatabaseId,
                    dryRun
                })
            });

            if (!response.ok) {
                const error = await safeJson(response);
                throw new Error(error.error || 'Migration failed to start');
            }

            const { jobId } = await safeJson(response);

            // Poll for status
            let completed = false;
            while (!completed) {
                await new Promise(resolve => setTimeout(resolve, 2000));

                const statusRes = await authFetch(`/api/admin/jobs/${jobId}`);
                if (!statusRes.ok) {
                    const error = await safeJson(statusRes);
                    throw new Error(error.error || 'Failed to check job status');
                }

                const { job } = await safeJson(statusRes);
                setProgress(job.progress);
                setStatus(job.details);

                if (job.status === 'completed') {
                    completed = true;
                    if (job.result?.dryRun) {
                        setMessage(`✅ Validation successful! The target project is ready for migration.`);
                    } else {
                        const stats = job.result?.stats;
                        const statsMsg = stats ? ` (Migrated ${stats.collections} collections and ${stats.files} files)` : '';
                        setMessage(`✅ Migration completed successfully!${statsMsg} You can now switch the app connection.`);
                    }
                    setProgress(100);
                } else if (job.status === 'failed') {
                    throw new Error(job.error || 'Migration job failed');
                }
            }
        } catch (error: any) {
            setMessage(`❌ ${dryRun ? 'Validation' : 'Migration'} failed: ${error.message}`);
        } finally {
            setIsMigrating(false);
            setStatus('');
            setShowConfirmModal(false);
            setValidatedConfig(null);
        }
    };

    const handleMigrate = async (dryRun: boolean = false) => {
        if (!isSuperUser && !isAdmin) return;

        // 1. Validate inputs locally first
        let validSa, validConfig;
        try {
            validSa = tryParseJson(targetServiceAccount, 'Service Account');
            validConfig = tryParseJson(targetFirebaseConfig, 'Firebase Config');
        } catch (error: any) {
            setMessage(`❌ Validation failed: ${error.message}`);
            return;
        }

        if (dryRun) {
            executeMigration(true, validSa, validConfig);
        } else {
            setValidatedConfig({ sa: validSa, config: validConfig });
            setShowConfirmModal(true);
        }
    };

    const handleSwitch = () => {
        try {
            const config = tryParseJson(targetFirebaseConfig, 'Firebase Config');
            setConnectionOverride({
                ...config,
                databaseId: targetDatabaseId
            });

            setStatusModal({
                isOpen: true,
                title: '🔌 App Connection Updated',
                message: 'The application connection has been updated to the new project. A page reload is required to apply the changes.',
                onConfirm: () => {
                    window.location.reload();
                }
            });
        } catch (e: any) {
            setStatusModal({
                isOpen: true,
                title: '❌ Configuration Error',
                message: 'Invalid Firebase Config JSON: ' + e.message,
                onConfirm: () => setStatusModal(null)
            });
        }
    };

    const handleReset = () => {
        clearConnectionOverride();
        setStatusModal({
            isOpen: true,
            title: '♻️ Connection Reset',
            message: 'App connection has been reset to default values. Reloading...',
            onConfirm: () => {
                window.location.reload();
            }
        });
    };

    if (!isSuperUser && !isAdmin) return null;

    return (
        <div className="space-y-6">
            <div className="bg-slate-700/20 rounded-xl p-6 border border-purple-500/20">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    🚀 System Migration Tool
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Target Service Account (JSON)</label>
                        <textarea
                            value={targetServiceAccount}
                            onChange={(e) => setTargetServiceAccount(e.target.value)}
                            placeholder='{ "type": "service_account", ... }'
                            className="w-full h-32 bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Target Firebase Config (JSON)</label>
                        <textarea
                            value={targetFirebaseConfig}
                            onChange={(e) => setTargetFirebaseConfig(e.target.value)}
                            placeholder='{ "apiKey": "...", "projectId": "...", ... }'
                            className="w-full h-24 bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Target Firestore Database ID</label>
                        <input
                            type="text"
                            value={targetDatabaseId}
                            onChange={(e) => setTargetDatabaseId(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                        <button
                            onClick={() => handleMigrate(true)}
                            disabled={isMigrating || !targetServiceAccount || !targetFirebaseConfig}
                            className="flex-1 min-w-[200px] px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-white/5 shadow-lg"
                        >
                            {isMigrating ? (
                                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span>🔍 Validate Target (Dry Run)</span>
                            )}
                        </button>

                        <button
                            onClick={() => handleMigrate(false)}
                            disabled={isMigrating || !targetServiceAccount || !targetFirebaseConfig}
                            className="flex-1 min-w-[200px] px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"
                        >
                            {isMigrating ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>📦 Start Full Migration</>
                            )}
                        </button>

                        <button
                            onClick={handleSwitch}
                            disabled={!targetFirebaseConfig}
                            className="flex-1 min-w-[200px] px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                        >
                            🔌 Switch App Connection
                        </button>
                    </div>

                    {activeOverride && (
                        <div className="mt-4 p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl flex items-center justify-between">
                            <div className="text-amber-300 text-sm">
                                <strong>⚠️ Active Override:</strong> Connected to project <code>{activeOverride.projectId}</code>
                            </div>
                            <button
                                onClick={handleReset}
                                className="px-3 py-1 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                                Reset to Default
                            </button>
                        </div>
                    )}
                </div>

                {isMigrating && (
                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-purple-400">
                            <span>{status || 'Processing...'}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-purple-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {message && (
                    <div className={`mt-6 p-4 rounded-xl text-sm font-medium animate-in zoom-in-95 duration-300 ${message.includes('❌')
                        ? 'bg-red-900/20 border border-red-500/30 text-red-300'
                        : 'bg-green-900/20 border border-green-500/30 text-green-300'
                        }`}>
                        {message}
                    </div>
                )}
            </div>

            <div className="text-xs text-slate-500 bg-slate-800/50 p-4 rounded-xl border border-white/5">
                <p className="font-bold mb-1">How to use:</p>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Paste the Service Account JSON of the target Google Cloud project.</li>
                    <li>Paste the Firebase Config JSON (from Project Settings &gt; General &gt; Your apps).</li>
                    <li>Ensure the target project has Firestore and Storage enabled.</li>
                    <li>Click <strong>Start Full Migration</strong> to sync all data.</li>
                    <li>Click <strong>Switch App Connection</strong> to redirect this browser session to the new project.</li>
                </ol>
            </div>

            <ConfirmModal
                isOpen={showConfirmModal}
                title="⚠️ Warning: Full System Migration"
                message="This action will clone ALL data (Firestore collections) and files (Storage) from the current project to the target project. This cannot be undone and may overwrite existing data in the target project."
                confirmLabel="Yes, Start Migration"
                cancelLabel="Cancel"
                isDestructive={true}
                onConfirm={() => {
                    setShowConfirmModal(false);
                    if (validatedConfig) {
                        executeMigration(false, validatedConfig.sa, validatedConfig.config);
                    }
                }}
                onClose={() => setShowConfirmModal(false)}
            />

            {statusModal && (
                <ConfirmModal
                    isOpen={statusModal.isOpen}
                    title={statusModal.title}
                    message={statusModal.message}
                    confirmLabel="Reload Now"
                    singleButton={!statusModal.title.includes('Error')}
                    onConfirm={statusModal.onConfirm}
                    onClose={() => setStatusModal(null)}
                />
            )}
        </div>
    );
}
