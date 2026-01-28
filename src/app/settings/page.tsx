'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Link from 'next/link';

function SettingsContent() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 mb-2">
                        <span>←</span> Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Settings
                    </h1>
                    <p className="text-slate-400">Manage your profile and application preferences.</p>
                </div>

                <div className="space-y-6">
                    {/* Profile Section */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="text-blue-400">👤</span> User Profile
                        </h2>
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-4xl overflow-hidden border border-white/10">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                ) : (
                                    <span>👤</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="text-lg font-bold">{user?.displayName || 'Anonymous User'}</div>
                                <div className="text-slate-400">{user?.email}</div>
                                <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    {user?.id === 'mock-user-123' ? 'Mock Mode Enabled' : 'Verified Account'}
                                </div>
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
                                        <div className="text-sm text-slate-500">Connected to {user?.youtubeChannelInfo?.title || 'Unknown Channel'}</div>
                                    </div>
                                </div>
                                <div className="text-emerald-400 text-sm font-bold flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Connected
                                </div>
                            </div>
                        </div>
                    </div>
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
