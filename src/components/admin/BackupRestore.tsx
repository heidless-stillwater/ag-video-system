import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import JSZip from 'jszip';
import { BackupData, RestoreSelections } from '@/lib/services/backupService';

interface BackupRestoreProps {
    type: 'user' | 'system';
}

export function BackupRestore({ type }: BackupRestoreProps) {
    const { authFetch, firebaseUser } = useAuth();
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [message, setMessage] = useState('');
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [overwrite, setOverwrite] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
    const [cloudPath, setCloudPath] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');

    // Cloud Backups State
    const [backups, setBackups] = useState<any[]>([]);
    const [isLoadingBackups, setIsLoadingBackups] = useState(false);
    const [showBackupList, setShowBackupList] = useState(false);

    // Selection State
    const [backupData, setBackupData] = useState<BackupData | null>(null);
    const [selections, setSelections] = useState<RestoreSelections>({
        collections: [],
        projectIds: [],
        includeStorage: true,
        includeAuth: true
    });

    const [integrityReport, setIntegrityReport] = useState<any>(null);
    const [backupPassword, setBackupPassword] = useState('');
    const [restorePassword, setRestorePassword] = useState('');
    const [isEncryptedBackup, setIsEncryptedBackup] = useState(false);

    const safeJson = async (res: Response) => {
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            return { error: text || res.statusText || 'Unknown server error' };
        }
    };

    const fetchBackups = async () => {
        setIsLoadingBackups(true);
        try {
            const res = await authFetch(`/api/backup/list?type=${type}`);
            const data = await safeJson(res);
            if (data.success) {
                setBackups(data.backups);
            }
        } catch (e) {
            console.error('Failed to fetch backups', e);
        } finally {
            setIsLoadingBackups(false);
        }
    };

    useEffect(() => {
        if (showBackupList) {
            fetchBackups();
        }
    }, [showBackupList]);

    const handleBackup = async () => {
        if (!firebaseUser) return;

        setIsBackingUp(true);
        setMessage('');
        setProgress(0);
        setStatus('Initializing backup job...');

        try {
            const response = await authFetch('/api/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    password: backupPassword || undefined
                })
            });

            if (!response.ok) {
                const error = await safeJson(response);
                throw new Error(error.error || 'Backup failed to start');
            }

            const { jobId } = await safeJson(response);

            // Poll for status
            let completed = false;
            while (!completed) {
                await new Promise(resolve => setTimeout(resolve, 2000));

                const statusResponse = await authFetch(`/api/admin/jobs/${jobId}`);
                if (!statusResponse.ok) {
                    const error = await safeJson(statusResponse);
                    throw new Error(error.error || 'Failed to check job status');
                }

                const { job } = await safeJson(statusResponse);

                setProgress(job.progress);
                setStatus(job.details);

                if (job.status === 'completed') {
                    completed = true;
                    if (job.result?.downloadUrl) {
                        const a = document.createElement('a');
                        a.href = job.result.downloadUrl;
                        a.download = job.result.filename || 'backup.zip';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setMessage(`✅ Backup completed: ${job.result.filename}`);
                        fetchBackups(); // Refresh list
                    }
                } else if (job.status === 'failed') {
                    throw new Error(job.error || 'Backup job failed');
                } else if (job.status === 'cancelled') {
                    throw new Error('Backup was cancelled');
                }
            }
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setIsBackingUp(false);
            setStatus('');
        }
    };

    const analyzeZip = async (source: File | Blob | ArrayBuffer, name: string, path?: string) => {
        setIsAnalyzing(true);
        setMessage('');

        try {
            const zip = await JSZip.loadAsync(source);
            const manifestFile = zip.file('backup.json');
            if (!manifestFile) throw new Error('Invalid backup: missing backup.json');

            const manifestContent = await manifestFile.async('string');
            const data: BackupData = JSON.parse(manifestContent);
            setBackupData(data);
            setIsEncryptedBackup(false);

            // Initialize selections
            setSelections({
                collections: [...data.metadata.collections],
                projectIds: data.projects?.map(p => p.id) || [],
                includeStorage: !!(data.storageManifest && data.storageManifest.length > 0),
                includeAuth: !!(data.authUsers && data.authUsers.length > 0)
            });

            if (source instanceof File || source instanceof Blob) {
                setSelectedFile(source);
            }
            if (path) {
                setCloudPath(path);
            }

            setShowRestoreConfirm(true);
        } catch (error: any) {
            if (error.message.includes('corrupted') || error.message.includes('signature')) {
                setIsEncryptedBackup(true);
                setSelections({ collections: [], projectIds: [], includeStorage: true, includeAuth: true });
                if (source instanceof File || source instanceof Blob) setSelectedFile(source);
                if (path) setCloudPath(path);
                setShowRestoreConfirm(true);
                setMessage('🔓 This backup appears to be encrypted. Please enter the password.');
            } else {
                setMessage(`❌ Error analyzing backup: ${error.message}`);
                setSelectedFile(null);
                setCloudPath(null);
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.zip')) {
            setMessage('❌ Please select a .zip backup file');
            return;
        }

        await analyzeZip(file, file.name);
    };

    const handleCloudSelect = async (backup: any) => {
        setIsAnalyzing(true);
        setMessage('');
        setCloudPath(backup.path);
        setRestorePassword('');

        const isEncrypted = backup.name.endsWith('.enc');
        setIsEncryptedBackup(isEncrypted);

        if (isEncrypted) {
            // Can't analyze encrypted cloud backups easily without password
            setShowRestoreConfirm(true);
            setIsAnalyzing(false);
            return;
        }

        try {
            const token = await firebaseUser?.getIdToken();
            const res = await fetch(`/api/admin/jobs/download?path=${encodeURIComponent(backup.path)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to download backup for analysis');

            const buffer = await res.arrayBuffer();
            await analyzeZip(buffer, backup.name, backup.path);
        } catch (e: any) {
            setMessage(`❌ Error linking cloud backup: ${e.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleCollection = (col: string) => {
        setSelections(prev => ({
            ...prev,
            collections: prev.collections?.includes(col)
                ? prev.collections.filter(c => c !== col)
                : [...(prev.collections || []), col]
        }));
    };

    const toggleProject = (id: string) => {
        setSelections(prev => ({
            ...prev,
            projectIds: prev.projectIds?.includes(id)
                ? prev.projectIds.filter(p => p !== id)
                : [...(prev.projectIds || []), id]
        }));
    };

    const handleRestore = async () => {
        if (!firebaseUser) return;
        if (!selectedFile && !cloudPath) return;

        setIsRestoring(true);
        setMessage('');
        setProgress(0);

        try {
            let jobId: string;

            if (cloudPath) {
                setStatus('Initiating cloud restore...');
                const response = await authFetch('/api/backup/restore-cloud', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        path: cloudPath,
                        overwrite,
                        selections,
                        password: restorePassword || undefined
                    })
                });

                if (!response.ok) {
                    const error = await safeJson(response);
                    throw new Error(error.error || 'Cloud restore failed to start');
                }

                const data = await safeJson(response);
                jobId = data.jobId;
            } else if (selectedFile) {
                setStatus('Uploading backup...');
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('type', type);
                formData.append('overwrite', overwrite.toString());
                if (restorePassword) formData.append('password', restorePassword);
                formData.append('selections', JSON.stringify(selections));

                const token = await firebaseUser.getIdToken();
                const xhr = new XMLHttpRequest();
                const uploadPromise = new Promise<{ jobId: string }>((resolve, reject) => {
                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            setProgress(Math.round((e.loaded / e.total) * 100));
                        }
                    });

                    xhr.onreadystatechange = () => {
                        if (xhr.readyState === 4) {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(new Error('Invalid response from server')); }
                            } else {
                                try {
                                    const err = JSON.parse(xhr.responseText);
                                    reject(new Error(err.error || 'Upload failed'));
                                } catch (e) {
                                    reject(new Error(xhr.responseText || 'Upload failed with status ' + xhr.status));
                                }
                            }
                        }
                    };
                    xhr.onerror = () => reject(new Error('Network error during upload'));
                    xhr.open('POST', '/api/backup/restore');
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                    xhr.send(formData);
                });

                const data = await uploadPromise;
                jobId = data.jobId;
            } else {
                throw new Error('No restore source selected');
            }

            // 2. Job Polling phase
            let completed = false;
            while (!completed) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const statusRes = await authFetch(`/api/admin/jobs/${jobId}`);
                if (!statusRes.ok) {
                    const error = await safeJson(statusRes);
                    throw new Error(error.error || 'Status check failed');
                }

                const { job } = await safeJson(statusRes);
                setProgress(job.progress);
                setStatus(job.details);

                if (job.status === 'completed') {
                    completed = true;
                    const report = job.result?.integrityReport;
                    if (report) {
                        setIntegrityReport(report);
                        setMessage(`✅ Restore complete! Verified ${report.successCount} items. ${report.failCount > 0 ? `⚠️ ${report.failCount} issues found.` : ''}`);
                    } else {
                        setMessage(`✅ Restore complete: ${job.details}`);
                    }
                    setShowRestoreConfirm(false);
                    setSelectedFile(null);
                    setCloudPath(null);
                    setBackupData(null);
                } else if (job.status === 'failed') {
                    throw new Error(job.error || 'Restore job failed');
                }
            }

        } catch (error: any) {
            setMessage(`❌ Restore failed: ${error.message}`);
        } finally {
            setIsRestoring(false);
            setStatus('');
        }
    };

    const cancelRestore = () => {
        setShowRestoreConfirm(false);
        setSelectedFile(null);
        setCloudPath(null);
        setBackupData(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-4">
            {/* Backup Section */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            📦 {type === 'system' ? 'Platform Backup' : 'User Data Backup'}
                        </h3>
                        <p className="text-slate-400 text-xs text-left">
                            Generate a snapshot of {type === 'system' ? 'all system data, users, and projects' : 'your personal projects and scripts'}.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                            <input
                                type="password"
                                placeholder="Backup Password (Optional)"
                                value={backupPassword}
                                onChange={(e) => setBackupPassword(e.target.value)}
                                autoComplete="new-password"
                                className="px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs font-mono text-slate-300 focus:outline-none focus:border-purple-500 transition-colors w-full"
                            />
                            <button
                                onClick={handleBackup}
                                disabled={isBackingUp || isRestoring}
                                className={`px-4 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap shadow-lg ${type === 'system' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                                    }`}
                            >
                                {isBackingUp ? 'Processing...' : 'Start Backup'}
                            </button>
                        </div>
                        {backupPassword && (
                            <p className="text-[9px] text-amber-400 font-bold uppercase tracking-wider text-right">
                                🔒 AES-256 Encryption Enabled
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip,.enc"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isBackingUp || isRestoring || isAnalyzing}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition-colors border border-white/5 shadow-md flex items-center gap-2"
                    >
                        {isAnalyzing ? <span className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" /> : '📂'} Restore File
                    </button>
                    <button
                        onClick={() => setShowBackupList(!showBackupList)}
                        className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-xs transition-colors border border-dashed border-white/10 flex items-center gap-2"
                    >
                        ☁️ {showBackupList ? 'Hide Cloud Backups' : 'Manage Cloud Backups'}
                    </button>
                </div>

                {isBackingUp && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <span>{status}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5 shadow-inner">
                            <div
                                className={`h-full transition-all duration-300 ease-out ${type === 'system' ? 'bg-amber-500' : 'bg-blue-500'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Cloud Backup List */}
            {showBackupList && (
                <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Cloud Backups ({backups.length})</h4>
                        <button onClick={fetchBackups} className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase">Refresh</button>
                    </div>

                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {isLoadingBackups ? (
                            <div className="p-8 text-center">
                                <span className="w-6 h-6 border-2 border-white/10 border-t-white/50 rounded-full animate-spin inline-block" />
                            </div>
                        ) : backups.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs font-medium">No backups found in the cloud.</div>
                        ) : (
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-800 text-slate-500 font-bold uppercase text-[9px]">
                                    <tr>
                                        <th className="px-4 py-2">Filename</th>
                                        <th className="px-4 py-2">Date</th>
                                        <th className="px-4 py-2 text-right">Size</th>
                                        <th className="px-4 py-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {backups.map(b => (
                                        <tr key={b.path} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">{b.name}</td>
                                            <td className="px-4 py-3 text-slate-400">{new Date(b.updated).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-slate-400">{formatSize(b.size)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleCloudSelect(b)}
                                                    className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg font-bold transition-all border border-blue-500/20"
                                                >
                                                    Restore
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {message && (
                <div className={`p-4 rounded-xl text-sm font-medium animate-in zoom-in-95 duration-300 ${message.includes('❌')
                    ? 'bg-red-900/20 border border-red-500/30 text-red-300'
                    : 'bg-green-900/20 border border-green-500/30 text-green-300'
                    }`}>
                    <div className="flex items-center justify-between">
                        <span>{message}</span>
                        {integrityReport && (
                            <button
                                onClick={() => setIntegrityReport(null)}
                                className="text-[10px] uppercase font-bold opacity-50 hover:opacity-100"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}

            {integrityReport && (
                <div className="bg-slate-800/50 rounded-2xl border border-white/5 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Restoration Integrity Report</h4>
                        <span className="text-[10px] text-slate-500">{new Date(integrityReport.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                                <div className="text-2xl font-bold text-green-400">{integrityReport.successCount}</div>
                                <div className="text-[10px] font-bold text-green-500/70 uppercase">Success</div>
                            </div>
                            <div className={`rounded-xl p-3 text-center border ${integrityReport.failCount > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-500/10 border-white/5'}`}>
                                <div className={`text-2xl font-bold ${integrityReport.failCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>{integrityReport.failCount}</div>
                                <div className={`text-[10px] font-bold uppercase ${integrityReport.failCount > 0 ? 'text-red-500/70' : 'text-slate-500/70'}`}>Failures</div>
                            </div>
                        </div>

                        {integrityReport.log?.length > 0 && (
                            <div className="space-y-1.5">
                                <h5 className="text-[10px] font-bold uppercase text-slate-500 px-1">Detailed Logs</h5>
                                <div className="bg-black/30 rounded-lg p-3 max-h-40 overflow-y-auto custom-scrollbar font-mono text-[10px] text-slate-400 space-y-1 border border-white/5">
                                    {integrityReport.log.map((line: string, i: number) => (
                                        <div key={i} className={line.includes('Failed') ? 'text-red-400/80' : ''}>{line}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Restore Confirmation / Selection Modal */}
            {showRestoreConfirm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-800 rounded-2xl border border-white/10 my-auto max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/10 shrink-0">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                🛠️ Interactive Restore
                            </h3>
                            <p className="text-slate-400 text-xs mt-1">
                                {cloudPath ? `☁️ ${cloudPath.split('/').pop()}` : `📂 ${selectedFile instanceof File ? selectedFile.name : 'Uploaded File'}`} (V{backupData?.metadata.version})
                            </p>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar text-left">
                            {/* Warning for System */}
                            {type === 'system' && (
                                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                                    <p className="text-red-300 text-xs font-medium">
                                        ⚠️ SYSTEM RESTORE: This will modify platform-wide data.
                                    </p>
                                </div>
                            )}

                            {/* Encryption Password */}
                            {isEncryptedBackup && (
                                <section className="space-y-3 bg-blue-900/20 p-4 rounded-xl border border-blue-500/20">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Restoration Key Required</h4>
                                        <span className="text-[9px] font-bold text-blue-500/50">AES-256-GCM</span>
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="Enter Backup Password"
                                        value={restorePassword}
                                        onChange={(e) => setRestorePassword(e.target.value)}
                                        autoComplete="new-password"
                                        className="w-full px-4 py-3 bg-slate-900 border border-blue-500/30 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-blue-500/30"
                                        autoFocus
                                    />
                                    <p className="text-[10px] text-blue-300/60 leading-tight">
                                        This backup is encrypted. You must provide the correct password to decrypt and restore the data.
                                    </p>
                                </section>
                            )}

                            {/* Collections Selection */}
                            <section className="space-y-3">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Collections</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {backupData?.metadata.collections.map(col => (
                                        <button
                                            key={col}
                                            onClick={() => toggleCollection(col)}
                                            className={`p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${selections.collections?.includes(col)
                                                ? 'bg-blue-600/20 border-blue-500/50 text-blue-100'
                                                : 'bg-slate-900/40 border-white/5 text-slate-500'
                                                }`}
                                        >
                                            <span className="capitalize">{col}</span>
                                            <span className="opacity-50 text-[9px]">{backupData.metadata.itemCounts[col] || 0}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Projects Selection (Granular) */}
                            {backupData?.projects && backupData.projects.length > 0 && (
                                <section className="space-y-3">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Specific Projects</h4>
                                    <div className="max-h-40 overflow-y-auto rounded-lg border border-white/5 bg-slate-900/40 custom-scrollbar">
                                        {backupData.projects.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => toggleProject(p.id)}
                                                className={`p-2 border-b border-white/5 last:border-0 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors ${selections.projectIds?.includes(p.id) ? 'bg-blue-600/5' : ''
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selections.projectIds?.includes(p.id)}
                                                    onChange={() => { }} // Handled by div click
                                                    className="w-3 h-3 rounded bg-slate-800 border-white/10 pointer-events-none"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[11px] font-bold text-slate-200 truncate">{p.title || 'Untitled'}</div>
                                                    <div className="text-[9px] text-slate-500 truncate">{p.id}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Additional Options */}
                            <section className="bg-slate-900/60 rounded-xl p-4 border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="text-xs font-bold text-slate-200">Include Storage Assets</div>
                                        <div className="text-[10px] text-slate-500">{backupData?.storageManifest?.length || 0} files included in ZIP</div>
                                    </div>
                                    <button
                                        onClick={() => setSelections(s => ({ ...s, includeStorage: !s.includeStorage }))}
                                        className={`w-10 h-5 rounded-full transition-all relative ${selections.includeStorage ? 'bg-green-600' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${selections.includeStorage ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>

                                {type === 'system' && backupData?.authUsers && (
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="space-y-0.5">
                                            <div className="text-xs font-bold text-slate-200">Restore Auth Users</div>
                                            <div className="text-[10px] text-slate-500">{backupData.authUsers.length} profiles to migrate</div>
                                        </div>
                                        <button
                                            onClick={() => setSelections(s => ({ ...s, includeAuth: !s.includeAuth }))}
                                            className={`w-10 h-5 rounded-full transition-all relative ${selections.includeAuth ? 'bg-green-600' : 'bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${selections.includeAuth ? 'left-6' : 'left-1'}`} />
                                        </button>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="space-y-0.5">
                                        <div className="text-xs font-bold text-slate-200">Overwrite Existing</div>
                                        <div className="text-[10px] text-slate-500">OFF = Merge mode (keep newer data)</div>
                                    </div>
                                    <button
                                        onClick={() => setOverwrite(!overwrite)}
                                        className={`w-10 h-5 rounded-full transition-all relative ${overwrite ? 'bg-amber-600' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${overwrite ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>
                            </section>
                        </div>

                        <div className="p-6 border-t border-white/10 shrink-0 bg-slate-900/40 flex flex-col gap-4">
                            {isRestoring && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                                        <span>{status}</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={cancelRestore}
                                    className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRestore}
                                    disabled={isRestoring || (!selections.collections?.length && !selections.projectIds?.length)}
                                    className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${type === 'system'
                                        ? 'bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white shadow-lg shadow-red-900/20'
                                        : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-lg shadow-blue-900/20'
                                        }`}
                                >
                                    {isRestoring ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Restoring Selection...
                                        </>
                                    ) : (
                                        'Start Restore'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Automation Section (System Only) */}
            {type === 'system' && (
                <div className="bg-slate-800/40 rounded-2xl border border-white/5 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>🤖</span> Automation & Scheduling
                    </h3>
                    <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
                        <p>
                            You can automate nightly system backups by setting up a CRON job (e.g. via Google Cloud Scheduler)
                            that calls the following endpoint:
                        </p>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-[10px] text-blue-300 border border-white/5 break-all">
                            GET /api/backup/cron
                        </div>
                        <p className="text-amber-400/80 font-medium">
                            ⚠️ Ensure you have <code>CRON_SECRET</code> configured in your environment variables and include
                            an <code>x-cron-secret</code> header in your request.
                        </p>
                    </div>
                </div>
            )}

            {/* Help Text */}
            <div className="text-xs text-slate-500 italic px-2">
                {type === 'system' ? (
                    <p>
                        System backup includes all users, projects, scripts, topics, and plan nicknames.
                        Backups are saved as timestamped ZIP files to the cloud.
                    </p>
                ) : (
                    <p>
                        User backup includes your projects, scripts, and topics.
                        Backups are saved as timestamped ZIP files for local download.
                    </p>
                )}
            </div>
        </div>
    );
}


