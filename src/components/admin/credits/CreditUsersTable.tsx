'use client';

import React, { useState } from 'react';
import { Search, Filter, Shield, User as UserIcon, MoreVertical, CreditCard, ArrowRight } from 'lucide-react';
import { User, UserPlan } from '@/types';
import { UserAvatar } from '@/components/common/UserAvatar';

interface CreditUsersTableProps {
    users: User[];
    onSelectUser: (user: User) => void;
    isLoading?: boolean;
}

export const CreditUsersTable: React.FC<CreditUsersTableProps> = ({ users, onSelectUser, isLoading = false }) => {
    const [search, setSearch] = useState('');

    const filteredUsers = users.filter(u => 
        u.email.toLowerCase().includes(search.toLowerCase()) || 
        u.displayName.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-16 bg-slate-900 animate-pulse rounded-xl border border-slate-800" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50 backdrop-blur-md">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                    />
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all border border-slate-700">
                    <Filter className="w-3.5 h-3.5" />
                    <span>Advanced Filters</span>
                </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-800/30 border-b border-slate-800">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Subject Identity</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Strategic Tier</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Liquidity</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Status</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {filteredUsers.map((user) => (
                            <tr 
                                key={user.id} 
                                onClick={() => onSelectUser(user)}
                                className="group hover:bg-indigo-500/5 cursor-pointer transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <UserAvatar user={user} size="md" className="rounded-xl" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{user.displayName}</span>
                                            <span className="text-[10px] text-slate-500 font-medium">{user.email}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Shield className={`w-4 h-4 ${getPlanColor(user.plan)}`} />
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-300">
                                            {user.plan}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="text-sm font-black text-white tabular-nums">
                                            {(user.creditBalance || 0).toLocaleString()}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Credits</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center">
                                        <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                            user.subscriptionStatus === 'active' 
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                            : 'bg-slate-800 text-slate-500 border-slate-700'
                                        }`}>
                                            {user.subscriptionStatus || 'None'}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-2 text-slate-600 hover:text-white hover:bg-slate-800 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && (
                    <div className="p-20 flex flex-col items-center gap-4">
                        <UserIcon className="w-12 h-12 text-slate-800" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No personnel matched search parameters.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

function getPlanColor(plan: UserPlan): string {
    switch (plan) {
        case 'premium': return 'text-purple-400';
        case 'standard': return 'text-indigo-400';
        case 'trial': return 'text-amber-400';
        default: return 'text-slate-500';
    }
}
