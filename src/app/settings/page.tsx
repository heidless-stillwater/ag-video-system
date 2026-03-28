'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RequireRole } from '@/components/auth/RequireRole';
import { UserRole, UserPlan, DEFAULT_PLAN_NICKNAMES } from '@/types';
import { BackupRestore } from '@/components/admin/BackupRestore';
import Link from 'next/link';

function SettingsContent() {
    const { user, firebaseUser, roles, plan, planNickname, isAdmin, isSuperUser, authFetch } = useAuth();
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const handleSaveProfile = async () => {
        if (!displayName.trim() || !firebaseUser) return;

        setSaving(true);
        setMessage('');
        try {
            const res = await authFetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayName: displayName.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setMessage('✅ Profile updated successfully');
                setIsEditing(false);
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const getRoleBadgeColor = (role: UserRole) => {
        switch (role) {
            case 'su': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'admin': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'user': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const getPlanColor = (p: UserPlan) => {
        switch (p) {
            case 'custom': return 'from-purple-600 to-indigo-700';
            case 'premium': return 'from-yellow-500 to-amber-600';
            case 'standard': return 'from-green-600 to-green-700';
            case 'trial': return 'from-blue-600 to-blue-700';
            case 'guest': return 'from-slate-600 to-slate-700';
            default: return 'from-slate-600 to-slate-700';
        }
    };

    const getPlanIcon = (p: UserPlan) => {
        switch (p) {
            case 'guest': return '👋';
            case 'trial': return '⏳';
            case 'standard': return '⭐';
            case 'premium': return '💎';
            case 'custom': return '🎯';
            default: return '📋';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 pt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 mb-2">
                        <span>←</span> Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Settings
                    </h1>
                    <p className="text-slate-400">Manage your profile and application preferences.</p>
                </div>

                {/* Message */}
                {message && (
                    <div className={`p-4 rounded-lg mb-6 ${message.includes('❌')
                        ? 'bg-red-900/20 border border-red-500/30 text-red-300'
                        : 'bg-green-900/20 border border-green-500/30 text-green-300'
                        }`}>
                        {message}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Profile Section */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="text-blue-400">👤</span> User Profile
                        </h2>
                        <div className="flex items-start gap-6">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-4xl overflow-hidden border border-white/10 flex-shrink-0">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                ) : (
                                    <span>👤</span>
                                )}
                            </div>
                            <div className="flex-1">
                                {isEditing ? (
                                    <div className="flex items-center gap-3 mb-2">
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            className="flex-1 bg-slate-800 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                            placeholder="Display Name"
                                        />
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={saving}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium disabled:opacity-50"
                                        >
                                            {saving ? '...' : 'Save'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                setDisplayName(user?.displayName || '');
                                            }}
                                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="text-lg font-bold">{user?.displayName || 'Anonymous User'}</div>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="text-blue-400 hover:text-blue-300 text-sm"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                )}
                                <div className="text-slate-400">{user?.email}</div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {roles.map(role => (
                                        <span
                                            key={role}
                                            className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${getRoleBadgeColor(role)}`}
                                        >
                                            {role === 'su' ? '⚡ Super User' : role === 'admin' ? '🛡️ Admin' : '👤 User'}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Your Plan Section */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="text-green-400">📋</span> Your Plan
                        </h2>
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getPlanColor(plan)} flex items-center justify-center text-4xl shadow-lg flex-shrink-0`}>
                                {getPlanIcon(plan)}
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <div className="text-2xl font-bold text-white capitalize">{planNickname}</div>
                                <div className="text-slate-400 text-sm mt-1">
                                    Plan type: <span className="text-slate-300">{plan}</span>
                                </div>
                                <div className="mt-3 text-sm text-slate-500">
                                    Plan features and limits are managed by administrators.
                                </div>
                            </div>
                            <Link 
                                href="/settings/billing"
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                            >
                                Manage Billing & Credits
                            </Link>
                        </div>
                    </div>

                    {/* Billing & Credits Overview Card */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm group hover:border-indigo-500/30 transition-all">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <span className="text-indigo-400">💰</span> Billing & Credits
                            </h2>
                            <Link 
                                href="/settings/billing"
                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest"
                            >
                                View Detailed History →
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="space-y-4">
                                <div className="bg-indigo-500/10 rounded-2xl p-6 border border-indigo-500/20">
                                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Available Liquidity</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-white tabular-nums">{(user?.creditBalance ?? 0).toLocaleString()}</span>
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Credits</span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                                    Credits are deducted for each AI action (scripting, voice-over, rendering). Ensure sufficient balance for uninterrupted production.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <Link 
                                    href="/settings/billing?tab=credits"
                                    className="p-4 bg-slate-800/50 hover:bg-slate-800 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all flex items-center justify-between group/item"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-xs">🚀</div>
                                        <div className="font-bold text-sm">Purchase Credits</div>
                                    </div>
                                    <span className="text-slate-600 group-hover/item:text-indigo-400 transform group-hover/item:translate-x-1 transition-all">→</span>
                                </Link>
                                <Link 
                                    href="/settings/billing?tab=plan"
                                    className="p-4 bg-slate-800/50 hover:bg-slate-800 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all flex items-center justify-between group/item"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xs">⚡</div>
                                        <div className="font-bold text-sm">Upgrade Tier</div>
                                    </div>
                                    <span className="text-slate-600 group-hover/item:text-indigo-400 transform group-hover/item:translate-x-1 transition-all">→</span>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* App Preferences */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="text-purple-400">⚙️</span> App Preferences
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl">
                                <div>
                                    <div className="font-bold">Default Mode</div>
                                    <div className="text-sm text-slate-500">Highest tier available for new projects</div>
                                </div>
                                <div className="px-4 py-2 bg-slate-700 rounded-xl text-sm font-bold">{user?.settings.defaultMode || 'DEV'}</div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-white/5 opacity-50 cursor-not-allowed">
                                <div>
                                    <div className="font-bold">Email Notifications</div>
                                    <div className="text-sm text-slate-500">Get updates on rendering progress</div>
                                </div>
                                <div className="w-12 h-6 bg-blue-600 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Backup & Restore */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="text-blue-400">💾</span> Data Backup & Restore
                        </h2>
                        <p className="text-slate-400 text-sm mb-4">
                            Create a backup of all your projects, scripts, and topics. Backups are saved as a ZIP file to your local device.
                        </p>
                        <BackupRestore type="user" />
                    </div>

                    {/* API Integrations */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="text-red-400">🔗</span> Integrations
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 text-xl">
                                        📺
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">YouTube</div>
                                        <div className="text-sm text-slate-500">
                                            {user?.youtubeChannelInfo?.title
                                                ? `Connected to ${user.youtubeChannelInfo.title}`
                                                : 'Not connected'}
                                        </div>
                                    </div>
                                </div>
                                {user?.youtubeChannelInfo?.title ? (
                                    <div className="text-emerald-400 text-sm font-bold flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Connected
                                    </div>
                                ) : (
                                    <div className="text-slate-500 text-sm">Not connected</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Admin Section - Only visible to admins */}
                    <RequireRole roles={['su', 'admin']}>
                        <div className="bg-slate-900/50 border border-amber-500/30 rounded-3xl p-8 backdrop-blur-sm">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="text-amber-400">🛡️</span> Admin Tools
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Link
                                    href="/admin/users"
                                    className="p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-white/5 hover:border-white/10 transition-all group"
                                >
                                    <div className="text-2xl mb-2">👥</div>
                                    <div className="font-bold text-white group-hover:text-blue-400 transition-colors">User Management</div>
                                    <div className="text-sm text-slate-500">Manage user roles and plans</div>
                                </Link>
                                <Link
                                    href="/admin/projects"
                                    className="p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-white/5 hover:border-white/10 transition-all group"
                                >
                                    <div className="text-2xl mb-2">🌐</div>
                                    <div className="font-bold text-white group-hover:text-blue-400 transition-colors">Global Projects</div>
                                    <div className="text-sm text-slate-500">Monitor all system projects</div>
                                </Link>
                                <Link
                                    href="/admin/nicknames"
                                    className="p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-white/5 hover:border-white/10 transition-all group"
                                >
                                    <div className="text-2xl mb-2">📝</div>
                                    <div className="font-bold text-white group-hover:text-blue-400 transition-colors">Plan Nicknames</div>
                                    <div className="text-sm text-slate-500">Customize plan display names</div>
                                </Link>
                                <Link
                                    href="/admin/tools"
                                    className="p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-white/5 hover:border-white/10 transition-all group"
                                >
                                    <div className="text-2xl mb-2">🔧</div>
                                    <div className="font-bold text-white group-hover:text-blue-400 transition-colors">Admin Tools</div>
                                    <div className="text-sm text-slate-500">System tools and diagnostics</div>
                                </Link>
                                {isSuperUser && (
                                    <div className="p-4 bg-red-900/20 rounded-xl border border-red-500/30">
                                        <div className="text-2xl mb-2">⚡</div>
                                        <div className="font-bold text-red-400">Super User Access</div>
                                        <div className="text-sm text-slate-500">Full system privileges enabled</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </RequireRole>
                </div>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <ProtectedRoute>
            <SettingsContent />
        </ProtectedRoute>
    );
}
