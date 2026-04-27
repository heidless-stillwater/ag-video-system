'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { UserRole, UserPlan, DEFAULT_PLAN_NICKNAMES } from '@/types';
import { UserAvatar } from '@/components/common/UserAvatar';
import Link from 'next/link';

interface UserData {
    id: string;
    email: string;
    displayName: string;
    roles: UserRole[];
    plan: UserPlan;
    photoURL?: string;
}

function UserManagementContent() {
    const { user: currentUser, firebaseUser, authFetch } = useAuth();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [actionInProgress, setActionInProgress] = useState(false);

    useEffect(() => {
        if (firebaseUser) {
            fetchUsers();
        }
    }, [firebaseUser, authFetch]);

    const fetchUsers = async () => {
        if (!firebaseUser) return;
        setLoading(true);
        try {
            const res = await authFetch('/api/users');
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, role: UserRole, action: 'add' | 'remove') => {
        if (!firebaseUser) return;
        setActionInProgress(true);
        setMessage('');
        try {
            const res = await authFetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, role })
            });
            const data = await res.json();
            if (data.success) {
                setMessage(`✅ ${data.message}`);
                fetchUsers();
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setActionInProgress(false);
        }
    };

    const handlePlanChange = async (userId: string, plan: UserPlan) => {
        if (!firebaseUser) return;
        setActionInProgress(true);
        setMessage('');
        try {
            const res = await authFetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan })
            });
            const data = await res.json();
            if (data.success) {
                setMessage(`✅ ${data.message}`);
                fetchUsers();
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setActionInProgress(false);
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

    const getPlanColor = (plan: UserPlan) => {
        switch (plan) {
            case 'custom': return 'text-purple-400';
            case 'premium': return 'text-yellow-400';
            case 'standard': return 'text-green-400';
            case 'trial': return 'text-blue-400';
            case 'guest': return 'text-slate-400';
            default: return 'text-slate-400';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 pt-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">👥 User Management</h1>
                        <p className="text-slate-400">Manage user roles and subscription plans</p>
                    </div>
                    <div className="flex gap-4">
                        <Link
                            href="/admin/nicknames"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                        >
                            📝 Manage Nicknames
                        </Link>
                        <Link
                            href="/admin/tools"
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                        >
                            ← Back to Admin
                        </Link>
                    </div>
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

                {/* Users Table */}
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-400">Loading users...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-700/30 text-left">
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-300">User</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-300">Roles</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-300">Plan</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-300">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={u as any} size="md" />
                                                    <div>
                                                        <p className="text-white font-medium">{u.displayName}</p>
                                                        <p className="text-slate-400 text-sm">{u.email}</p>
                                                        {u.id === currentUser?.id && (
                                                            <span className="text-xs text-blue-400">(You)</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {u.roles.map(role => (
                                                        <span
                                                            key={role}
                                                            className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getRoleBadgeColor(role)}`}
                                                        >
                                                            {role}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`font-medium ${getPlanColor(u.plan)}`}>
                                                    {DEFAULT_PLAN_NICKNAMES[u.plan] || u.plan}
                                                </span>
                                                <span className="text-slate-500 text-xs ml-2">({u.plan})</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => setSelectedUser(u)}
                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Edit Modal */}
                {selectedUser && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelectedUser(null)}>
                        <div className="bg-slate-800 rounded-2xl border border-white/10 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-bold text-white mb-4">Edit User</h2>
                            <div className="mb-4">
                                <p className="text-white font-medium">{selectedUser.displayName}</p>
                                <p className="text-slate-400 text-sm">{selectedUser.email}</p>
                            </div>

                            {/* Roles Section */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Roles</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(['su', 'admin', 'user'] as UserRole[]).map(role => {
                                        const hasRole = selectedUser.roles.includes(role);
                                        return (
                                            <button
                                                key={role}
                                                onClick={() => handleRoleChange(selectedUser.id, role, hasRole ? 'remove' : 'add')}
                                                disabled={actionInProgress}
                                                className={`px-3 py-2 rounded-lg text-sm font-bold uppercase transition-all disabled:opacity-50 ${hasRole
                                                    ? `${getRoleBadgeColor(role)} border`
                                                    : 'bg-slate-700/50 text-slate-400 border border-slate-600 hover:border-white/30'
                                                    }`}
                                            >
                                                {hasRole ? '✓' : '+'} {role}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Plan Section */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Plan</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['guest', 'trial', 'standard', 'premium', 'custom'] as UserPlan[]).map(plan => {
                                        const isActive = selectedUser.plan === plan;
                                        return (
                                            <button
                                                key={plan}
                                                onClick={() => handlePlanChange(selectedUser.id, plan)}
                                                disabled={actionInProgress || isActive}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${isActive
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {DEFAULT_PLAN_NICKNAMES[plan]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedUser(null)}
                                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function UserManagementPage() {
    return (
        <RoleGuard requiredRoles={['su', 'admin']}>
            <UserManagementContent />
        </RoleGuard>
    );
}
