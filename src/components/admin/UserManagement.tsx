'use client';

import React, { useState, useEffect } from 'react';
import { userService } from '@/lib/services/firestore';
import { User, UserRole } from '@/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { UserAvatar } from '@/components/common/UserAvatar';

export function UserManagement() {
    const { user: currentUser, authFetch } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const addCredits = async (targetUser: User, amount: number) => {
        setUpdatingUserId(targetUser.id);
        try {
            const response = await authFetch('/api/admin/top-up', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: targetUser.email || targetUser.id, amount })
            });
            const data = await response.json();
            if (data.success) {
                setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, creditBalance: (u.creditBalance || 0) + amount } : u));
                setMessage({ text: `Dispensed ${amount} credits to ${targetUser.displayName}.`, type: 'success' });
            } else {
                setMessage({ text: data.error || 'Dispense failed', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Dispense protocol error', type: 'error' });
        } finally {
            setUpdatingUserId(null);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const allUsers = await userService.getAllUsers();
            setUsers(allUsers);
        } catch (error) {
            console.error('Error loading users:', error);
            setMessage({ text: 'Failed to load users database', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleRole = async (targetUser: User, role: UserRole) => {
        if (targetUser.id === currentUser?.id) {
            setMessage({ text: "You cannot modify your own roles for system safety.", type: 'error' });
            return;
        }

        setUpdatingUserId(targetUser.id);
        const currentRoles = targetUser.roles || [];
        const newRoles = currentRoles.includes(role)
            ? currentRoles.filter(r => r !== role)
            : [...currentRoles, role];

        try {
            await userService.updateUser(targetUser.id, { roles: newRoles });
            setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, roles: newRoles } : u));
            setMessage({ text: `Protocol updated: ${targetUser.displayName} is now ${newRoles.includes(role) ? 'GRANTED' : 'REVOKED'} ${role.toUpperCase()} privilege.`, type: 'success' });
        } catch (err) {
            console.error('Error updating role:', err);
            setMessage({ text: 'Unauthorized: Protocol update failed.', type: 'error' });
        } finally {
            setUpdatingUserId(null);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 theme-card rounded-2xl animate-pulse">
                <div className="h-6 w-48 bg-slate-800 rounded mb-6"></div>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-slate-800/50 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-700/20 rounded-xl p-6 border border-white/5 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    👥 User Permissions & Identity
                </h2>
                <button 
                    onClick={loadUsers}
                    className="text-[10px] font-black tracking-widest text-slate-500 hover:text-white transition-colors uppercase italic"
                >
                    REFRESH_DATABASE ↻
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${
                    message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                }`}>
                    {message.text}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/5 text-slate-500 font-black uppercase tracking-widest text-[10px]">
                            <th className="px-4 py-4">Identity</th>
                            <th className="px-4 py-4">Active Roles</th>
                            <th className="px-4 py-4">Plan</th>
                            <th className="px-4 py-4">Credits</th>
                            <th className="px-4 py-4 text-right">Privilege Management</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.map(targetUser => (
                            <tr key={targetUser.id} className="group hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <UserAvatar user={targetUser} size="sm" />
                                        <div>
                                            <div className="font-bold text-white leading-none mb-1">{targetUser.displayName}</div>
                                            <div className="text-[10px] text-slate-500 font-mono italic">{targetUser.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {(targetUser.roles || ['user']).map(role => (
                                            <span 
                                                key={role} 
                                                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                                    role === 'su' ? 'bg-amber-500 text-black' : 
                                                    role === 'admin' ? 'bg-blue-500 text-white' : 
                                                    'bg-slate-800 text-slate-400'
                                                }`}
                                            >
                                                {role}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {targetUser.plan || 'standard'}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-emerald-400 font-bold min-w-[30px]">
                                            {targetUser.creditBalance || 0}
                                        </span>
                                        <button
                                            onClick={() => addCredits(targetUser, 100)}
                                            disabled={updatingUserId === targetUser.id}
                                            className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 rounded text-[8px] font-black uppercase tracking-tighter transition-all disabled:opacity-30"
                                            title="Add 100 Credits"
                                        >
                                            DISPENSE (+100)
                                        </button>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => toggleRole(targetUser, 'admin')}
                                            disabled={updatingUserId === targetUser.id || targetUser.id === currentUser?.id}
                                            className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                                                targetUser.roles?.includes('admin')
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700'
                                            } disabled:opacity-30`}
                                        >
                                            ADMIN
                                        </button>
                                        <button
                                            onClick={() => toggleRole(targetUser, 'su')}
                                            disabled={updatingUserId === targetUser.id || targetUser.id === currentUser?.id}
                                            className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                                                targetUser.roles?.includes('su')
                                                    ? 'bg-amber-600 text-black hover:bg-amber-700'
                                                    : 'bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700'
                                            } disabled:opacity-30`}
                                        >
                                            SUPER
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <p className="text-[10px] text-slate-500 italic mt-4">
                PROTOCOL NOTE: Modifying permissions affects cross-app synchronization (PromptTool). Ensure user identity is verified before granting administrative privilege.
            </p>
        </div>
    );
}
