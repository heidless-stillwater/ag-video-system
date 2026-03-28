'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { UserPlan, PlanNickname, DEFAULT_PLAN_NICKNAMES } from '@/types';
import Link from 'next/link';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

function NicknameManagementContent() {
    const { firebaseUser, authFetch } = useAuth();
    const [nicknames, setNicknames] = useState<PlanNickname[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [editingPlan, setEditingPlan] = useState<UserPlan | null>(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [resetPlan, setResetPlan] = useState<UserPlan | null>(null);

    useEffect(() => {
        if (firebaseUser) {
            fetchNicknames();
        }
    }, [firebaseUser, authFetch]);

    const fetchNicknames = async () => {
        if (!firebaseUser) return;
        setLoading(true);
        try {
            const res = await authFetch('/api/admin/nicknames');
            const data = await res.json();
            if (data.success) {
                setNicknames(data.nicknames);
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const startEditing = (plan: UserPlan, currentNickname: string) => {
        setEditingPlan(plan);
        setEditValue(currentNickname);
    };

    const cancelEditing = () => {
        setEditingPlan(null);
        setEditValue('');
    };

    const saveNickname = async () => {
        if (!editingPlan || !editValue.trim() || !firebaseUser) return;

        setSaving(true);
        setMessage('');
        try {
            const res = await authFetch('/api/admin/nicknames', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: editingPlan, nickname: editValue.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setMessage(`✅ Updated nickname for '${editingPlan}'`);
                fetchNicknames();
                cancelEditing();
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleResetClick = (plan: UserPlan) => {
        setResetPlan(plan);
    };

    const confirmReset = async () => {
        if (!resetPlan || !firebaseUser) return;

        const plan = resetPlan;
        setResetPlan(null);
        setSaving(true);
        setMessage('');
        try {
            const res = await authFetch('/api/admin/nicknames', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan })
            });
            const data = await res.json();
            if (data.success) {
                setMessage(`✅ Reset nickname for '${plan}' to default`);
                fetchNicknames();
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const getPlanIcon = (plan: UserPlan) => {
        switch (plan) {
            case 'guest': return '👋';
            case 'trial': return '⏳';
            case 'standard': return '⭐';
            case 'premium': return '💎';
            case 'custom': return '🎯';
            default: return '📋';
        }
    };

    const getPlanColor = (plan: UserPlan) => {
        switch (plan) {
            case 'guest': return 'from-slate-600 to-slate-700';
            case 'trial': return 'from-blue-600 to-blue-700';
            case 'standard': return 'from-green-600 to-green-700';
            case 'premium': return 'from-yellow-500 to-amber-600';
            case 'custom': return 'from-purple-600 to-indigo-700';
            default: return 'from-slate-600 to-slate-700';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 pt-24">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">📝 Plan Nicknames</h1>
                        <p className="text-slate-400">Customize display names for subscription plans</p>
                    </div>
                    <Link
                        href="/admin/users"
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                    >
                        ← Back to Users
                    </Link>
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

                {/* Nicknames Grid */}
                {loading ? (
                    <div className="text-center p-12">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-400">Loading nicknames...</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {nicknames.map((item) => (
                            <div
                                key={item.id}
                                className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:border-white/20 transition-colors"
                            >
                                <div className="flex items-center gap-6">
                                    {/* Plan Badge */}
                                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getPlanColor(item.plan)} flex items-center justify-center text-3xl shadow-lg`}>
                                        {getPlanIcon(item.plan)}
                                    </div>

                                    {/* Plan Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-slate-400 text-sm uppercase tracking-wider">{item.plan}</span>
                                            {item.isDefault && (
                                                <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">Default</span>
                                            )}
                                            {!item.isDefault && (
                                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">Custom</span>
                                            )}
                                        </div>

                                        {editingPlan === item.plan ? (
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="flex-1 bg-slate-900 border border-white/20 rounded-lg px-4 py-2 text-white text-xl font-bold focus:outline-none focus:border-blue-500"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveNickname();
                                                        if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                />
                                                <button
                                                    onClick={saveNickname}
                                                    disabled={saving}
                                                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium disabled:opacity-50"
                                                >
                                                    {saving ? '...' : 'Save'}
                                                </button>
                                                <button
                                                    onClick={cancelEditing}
                                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-white text-xl font-bold">{item.nickname}</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {editingPlan !== item.plan && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => startEditing(item.plan, item.nickname)}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                                            >
                                                Edit
                                            </button>
                                            {!item.isDefault && (
                                                <button
                                                    onClick={() => handleResetClick(item.plan)}
                                                    disabled={saving}
                                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                                    title={`Reset to: ${DEFAULT_PLAN_NICKNAMES[item.plan]}`}
                                                >
                                                    Reset
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Default Value Reference */}
                                {!item.isDefault && (
                                    <div className="mt-3 text-sm text-slate-500">
                                        Default: <span className="text-slate-400">{DEFAULT_PLAN_NICKNAMES[item.plan]}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Help Section */}
                <div className="mt-8 p-6 bg-slate-800/30 rounded-xl border border-white/5">
                    <h3 className="text-white font-semibold mb-2">💡 About Plan Nicknames</h3>
                    <p className="text-slate-400 text-sm">
                        Nicknames are user-friendly labels displayed instead of technical plan names.
                        Custom nicknames allow you to personalize the user experience without changing the underlying plan structure.
                    </p>
                </div>

                <ConfirmModal
                    isOpen={!!resetPlan}
                    onClose={() => setResetPlan(null)}
                    onConfirm={confirmReset}
                    title="Reset to Default?"
                    message={`Are you sure you want to reset the nickname for '${resetPlan}' back to its default value (${resetPlan ? DEFAULT_PLAN_NICKNAMES[resetPlan] : ''})?`}
                    confirmLabel="Reset"
                    isDestructive={false}
                />
            </div>
        </div>
    );
}

export default function NicknameManagementPage() {
    return (
        <RoleGuard requiredRoles={['su', 'admin']}>
            <NicknameManagementContent />
        </RoleGuard>
    );
}
