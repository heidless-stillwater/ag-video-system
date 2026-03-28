'use client';

import React, { useState } from 'react';
import { X, User as UserIcon, Shield, CreditCard, ArrowRight, History, Plus, Settings, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { User, CreditTransaction, PlanChangeRecord, UserPlan } from '@/types';
import { TransactionTable } from '../../billing/TransactionTable';
import { ConfirmationModal } from '../../common/ConfirmationModal';

interface CreditUserDrilldownProps {
    user: User;
    transactions: CreditTransaction[];
    planHistory: PlanChangeRecord[];
    onClose: () => void;
    onTopUp: (userId: string, amount: number) => Promise<void>;
    onPlanOverride: (userId: string, planId: UserPlan, reason: string) => Promise<void>;
    onRefreshUser?: (user: User) => Promise<void>; // Added for Force Sync
    isLoading?: boolean;
}

export const CreditUserDrilldown: React.FC<CreditUserDrilldownProps> = ({
    user,
    transactions,
    planHistory,
    onClose,
    onTopUp,
    onPlanOverride,
    onRefreshUser, // Added for Force Sync
    isLoading = false
}) => {
    const [topUpAmount, setTopUpAmount] = useState(100);
    const [overridePlan, setOverridePlan] = useState<UserPlan>(user.plan);
    const [overrideReason, setOverrideReason] = useState('');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        type: 'topup' | 'override' | 'success';
        title: string;
        description: string;
        confirmLabel?: string;
    }>({
        isOpen: false,
        type: 'topup',
        title: '',
        description: ''
    });

    const handleTopUp = async () => {
        setIsProcessing('topup');
        try {
            await onTopUp(user.id, topUpAmount);
            setConfirmation({
                isOpen: true,
                type: 'success',
                title: 'Injection Succeeded',
                description: `Successfully transmitted ${topUpAmount} credits to ${user.displayName}. System liquidity balance updated.`,
                confirmLabel: 'Acknowledge'
            });
        } finally {
            setIsProcessing(null);
        }
    };

    const handleOverride = async () => {
        const finalReason = overrideReason.trim() || `Manual override to ${overridePlan} tier`;
        setIsProcessing('override');
        try {
            await onPlanOverride(user.id, overridePlan, finalReason);
             setConfirmation({
                isOpen: true,
                type: 'success',
                title: 'Override Successful',
                description: `Direct personnel tier override completed. Subject ${user.displayName} is now aligned with the ${overridePlan} tier.`,
                confirmLabel: 'Acknowledge'
            });
        } finally {
            setIsProcessing(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-2xl h-full bg-slate-950 border-l border-slate-800 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-500">
                <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-8 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                             {user.photoURL ? (
                                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon className="w-6 h-6 text-slate-500" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">{user.displayName}</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.id}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="px-4 py-2 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2">
                            <X className="w-4 h-4" />
                            Close Panel
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-12 pb-24">
                    {/* User Stats Grid */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                            <div className="flex items-center gap-3 text-indigo-400 mb-4">
                                <CreditCard className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Active Balance</span>
                            </div>
                            <span className="text-3xl font-black text-white tabular-nums">{(user.creditBalance || 0).toLocaleString()}</span>
                        </div>
                         <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                            <div className="flex items-center gap-3 text-purple-400 mb-4">
                                <Shield className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Assigned Tier</span>
                            </div>
                             <span className="text-3xl font-black text-white uppercase tracking-tight">
                                {user.plan}
                                <span className="ml-2 text-[10px] font-normal text-slate-600 tabular-nums">({user.planNickname || 'AUTO'})</span>
                            </span>
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Raw Plan ID</span>
                                    <button 
                                        onClick={() => onRefreshUser?.(user)}
                                        className="p-1 px-2 text-[8px] font-black text-indigo-500 hover:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-md transition-all active:scale-90"
                                    >
                                        FORCE SYNC
                                    </button>
                                </div>
                                <div className="text-[10px] font-medium text-slate-500 font-mono break-all">{user.id}</div>
                            </div>
                        </div>
                    </div>

                    {/* Admin Tools: Plan Override */}
                    <div className="space-y-6">
                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
                            <Settings className="w-4 h-4" />
                            Account Tier
                        </h4>
                        <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                {(['guest', 'standard', 'premium', 'custom'] as UserPlan[]).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setOverridePlan(p)}
                                        className={`px-4 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${
                                            overridePlan === p 
                                                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20' 
                                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Authorization Reason</label>
                                <textarea 
                                    value={overrideReason}
                                    onChange={(e) => setOverrideReason(e.target.value)}
                                    placeholder="e.g. Strategic partnership, failed transaction correction..."
                                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-700 focus:outline-none focus:border-purple-600 min-h-[80px] resize-none"
                                />
                            </div>
                            <button 
                                onClick={() => setConfirmation({
                                    isOpen: true,
                                    type: 'override',
                                    title: 'Strategic Override',
                                    description: `Are you certain you wish to manually override ${user.displayName}'s tier to ${overridePlan}? This will bypass standard Stripe billing cycles.`,
                                    confirmLabel: 'Initiate Override'
                                })}
                                disabled={isProcessing === 'override'}
                                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
                            >
                                {isProcessing === 'override' ? 'Commiting Changes...' : 'Initiate Override'}
                            </button>
                        </div>
                    </div>

                    {/* Admin Tools: Top-Up */}
                    <div className="space-y-6">
                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
                            <Plus className="w-4 h-4" />
                            Strategic Liquidity Injection
                        </h4>
                        <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Injection Magnitude</label>
                                    <span className="text-xs font-black text-indigo-400">{topUpAmount} Credits</span>
                                </div>
                                <input 
                                    type="range"
                                    min="10"
                                    max="5000"
                                    step="10"
                                    value={topUpAmount}
                                    onChange={(e) => setTopUpAmount(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                            <button 
                                onClick={() => setConfirmation({
                                    isOpen: true,
                                    type: 'topup',
                                    title: 'Confirm Injection',
                                    description: `Are you sure you want to inject ${topUpAmount} credits into ${user.displayName}'s account? This action is logged in the permanent audit trail.`,
                                    confirmLabel: 'Execute Injection'
                                })}
                                disabled={isProcessing === 'topup'}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                            >
                                {isProcessing === 'topup' ? 'Authorizing...' : 'Execute Injection'}
                            </button>
                        </div>
                    </div>

                    {/* Audit Logs */}
                    <div className="space-y-8">
                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
                            <History className="w-4 h-4" />
                            Audit Log: Operational History
                        </h4>
                        <TransactionTable transactions={transactions} isLoading={isLoading} />
                    </div>

                    {/* Plan History */}
                    {planHistory.length > 0 && (
                        <div className="space-y-8">
                            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
                                <RefreshCw className="w-4 h-4" />
                                Audit Log: Strategic Alignment History
                            </h4>
                            <div className="space-y-4">
                                {planHistory.map(record => (
                                    <div key={record.id} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-slate-800 rounded-xl text-indigo-400">
                                                <History className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold uppercase tracking-wider text-[10px]">
                                                    {record.previousPlan} <ArrowRight className="inline w-3 h-3 mx-2 opacity-30" /> {record.newPlan}
                                                </p>
                                                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1">
                                                    {record.changeType}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-slate-400 text-[10px] font-bold">{new Date(record.effectiveAt).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Confirmation Modals */}
            <ConfirmationModal
                isOpen={confirmation.isOpen && (confirmation.type === 'topup' || confirmation.type === 'override')}
                onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmation.type === 'topup' ? handleTopUp : handleOverride}
                title={confirmation.title}
                description={confirmation.description}
                confirmLabel={confirmation.confirmLabel}
                confirmVariant={confirmation.type === 'override' ? 'danger' : 'primary'}
            />

            {/* Success Modal */}
            <ConfirmationModal
                isOpen={confirmation.isOpen && confirmation.type === 'success'}
                onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
                title={confirmation.title}
                description={confirmation.description}
                confirmLabel={confirmation.confirmLabel}
                confirmVariant="primary"
            />
        </div>
    );
};
