'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { CreditSystemOverview } from '@/components/admin/credits/CreditSystemOverview';
import { CreditUsersTable } from '@/components/admin/credits/CreditUsersTable';
import { CreditUserDrilldown } from '@/components/admin/credits/CreditUserDrilldown';
import { User, CreditTransaction, PlanChangeRecord, UserPlan } from '@/types';
import { ShieldAlert, RefreshCw, Layers, Database, ExternalLink } from 'lucide-react';
import Link from 'next/link';

function AdminCreditsContent() {
    const { authFetch, user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userTransactions, setUserTransactions] = useState<CreditTransaction[]>([]);
    const [userPlanHistory, setUserPlanHistory] = useState<PlanChangeRecord[]>([]);
    const [drilldownLoading, setDrilldownLoading] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [usersRes, configRes] = await Promise.all([
                authFetch('/api/users'), // Reusing existing user list endpoint
                authFetch('/api/admin/credits/config')
            ]);
            
            const userData = await usersRes.json();
            const configData = await configRes.json();

            if (userData.success) setUsers(userData.users);
            
            // Calculate some basic stats from user list for the overview
            const totalCredits = userData.users.reduce((acc: number, u: User) => acc + (u.creditBalance || 0), 0);
            const activeSubs = userData.users.filter((u: User) => u.subscriptionStatus === 'active').length;
            
            setStats({
                totalCredits,
                activeSubscriptions: activeSubs,
                revenueMonthly: activeSubs * 29, // Low-fidelity estimate
                creditsGrantMonthly: 5000, // Placeholder
                changeTotalCredits: 4.2,
                changeActiveSubs: 1.5
            });

        } catch (error) {
            console.error('Failed to fetch admin billing data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectUser = async (user: User) => {
        setSelectedUser(user);
        setDrilldownLoading(true);
        try {
            const [txRes, historyRes] = await Promise.all([
                authFetch(`/api/admin/credits/users/${user.id}/transactions`),
                authFetch(`/api/admin/plans/users/${user.id}/history`)
            ]);
            
            const txData = await txRes.json();
            const historyData = await historyRes.json();

            setUserTransactions(txData.transactions || []);
            setUserPlanHistory(historyData.history || []);
        } catch (error) {
            console.error('Failed to fetch user drilldown data:', error);
        } finally {
            setDrilldownLoading(false);
        }
    };

    const handleAdminTopUp = async (userId: string, amount: number) => {
        try {
            const res = await authFetch('/api/admin/top-up', {
                method: 'POST',
                body: JSON.stringify({ userId, amount })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to authorize injection');
            }
            // Immediate local update for UI feedback
            if (selectedUser?.id === userId) {
                setSelectedUser(prev => prev ? { ...prev, creditBalance: (prev.creditBalance || 0) + amount } : null);
                handleSelectUser({ ...selectedUser, creditBalance: (selectedUser.creditBalance || 0) + amount });
            }
            fetchInitialData();
        } catch (error) {
            console.error('Admin top-up failed:', error);
            throw error;
        }
    };

    const handleAdminPlanOverride = async (userId: string, planId: UserPlan, reason: string) => {
        try {
            const res = await authFetch(`/api/admin/plans/users/${userId}/change`, {
                method: 'POST',
                body: JSON.stringify({ planId, reason })
            });

            if (!res.ok) {
                const data = await res.json();
                console.error('[Admin Override Failed]:', data);
                throw new Error(data.error || 'Failed to initiate override');
            }

            // Immediate local update for UI feedback
            if (selectedUser?.id === userId) {
                setSelectedUser(prev => prev ? { ...prev, plan: planId, planNickname: null } : null);
            }
            fetchInitialData();
        } catch (error) {
            console.error('Admin plan override failed:', error);
            throw error;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
                <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] animate-pulse">Syncing Credit Registry...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-8 pb-32">
            <div className="max-w-7xl mx-auto space-y-12">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-slate-900/40 p-10 rounded-3xl border border-slate-800 backdrop-blur-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Database className="w-32 h-32 text-indigo-500" />
                    </div>
                    
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3 text-indigo-400">
                            <ShieldAlert className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Administrative Nexus</span>
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tighter uppercase">Credit Management</h1>
                        <p className="max-w-xl text-slate-500 font-medium text-sm leading-relaxed">
                            Global oversight of system liquidity, user tier alignments, and transaction auditing. Use strategic overrides to maintain ecosystem stability.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 relative z-10">
                         <Link 
                            href="/admin/tools"
                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700 flex items-center justify-center gap-2"
                        >
                            <span>Return to Base</span>
                        </Link>
                        <button 
                            onClick={fetchInitialData}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Refresh Registry</span>
                        </button>
                    </div>
                </div>

                {/* System Overview */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Layers className="w-4 h-4 text-slate-500" />
                        <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">System-Wide Metrics</h2>
                    </div>
                    <CreditSystemOverview stats={stats} />
                </div>

                {/* Personnel Registry */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <Database className="w-4 h-4 text-slate-500" />
                            <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Personnel Liquidity Registry</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Total Registered: {users.length}</span>
                        </div>
                    </div>
                    <CreditUsersTable 
                        users={users} 
                        onSelectUser={handleSelectUser} 
                    />
                </div>
            </div>

            {/* Drilldown Drawer */}
            {selectedUser && (
                <CreditUserDrilldown
                    user={selectedUser}
                    transactions={userTransactions}
                    planHistory={userPlanHistory}
                    onClose={() => setSelectedUser(null)}
                    onTopUp={handleAdminTopUp}
                    onPlanOverride={handleAdminPlanOverride}
                    onRefreshUser={handleSelectUser}
                    isLoading={drilldownLoading}
                />
            )}
        </div>
    );
}

export default function AdminCreditsPage() {
    return (
        <RoleGuard requiredRoles={['su', 'admin']}>
            <AdminCreditsContent />
        </RoleGuard>
    );
}
