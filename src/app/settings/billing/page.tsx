'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { PRICING_CONFIG } from '@/lib/config/pricing';
import { CreditBalanceCard } from '@/components/billing/CreditBalanceCard';
import { PlanComparisonGrid } from '@/components/billing/PlanComparisonGrid';
import { CurrentPlanCard } from '@/components/billing/CurrentPlanCard';
import { CreditPackCards } from '@/components/billing/CreditPackCards';
import { TransactionTable } from '@/components/billing/TransactionTable';
import { AutoRefillSettings } from '@/components/billing/AutoRefillSettings';
import { ProrationPreviewModal } from '@/components/billing/ProrationPreviewModal';
import { CreditTransaction, PlanChangeRecord, PlanDefinition, UserPlan } from '@/types';
import { Shield, CreditCard, History, Loader2, Sparkles, ArrowRight } from 'lucide-react';

type Tab = 'plan' | 'credits' | 'history';

export default function BillingPage() {
    const { user, authFetch } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('plan');
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [planHistory, setPlanHistory] = useState<PlanChangeRecord[]>([]);
    const [currentPlanDef, setCurrentPlanDef] = useState<PlanDefinition | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    
    // Proration Modal State
    const [prorationModal, setProrationModal] = useState<{
        isOpen: boolean;
        targetPlanId: string;
        preview: any | null;
    }>({ isOpen: false, targetPlanId: '', preview: null });

    useEffect(() => {
        if (user) {
            refreshData();
        }
    }, [user]);

    const refreshData = async () => {
        setLoading(true);
        try {
            const [planRes, txRes, historyRes] = await Promise.all([
                authFetch('/api/plans/current'),
                authFetch('/api/credits/transactions?limit=20'),
                authFetch('/api/plans/history?limit=10')
            ]);
            
            const planData = await planRes.json();
            const txData = await txRes.json();
            const historyData = await historyRes.json();

            setCurrentPlanDef(planData.planDefinition);
            setTransactions(txData.transactions || []);
            setPlanHistory(historyData.history || []);
        } catch (error) {
            console.error('Failed to hydrate billing data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBuyPack = async (packId: string) => {
        setActionLoading(packId);
        try {
            const res = await authFetch('/api/credits/purchase', {
                method: 'POST',
                body: JSON.stringify({ packId })
            });
            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (error) {
            console.error('Purchase failed:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpgradeTrigger = async (planId: string) => {
        if (!user?.stripeSubscriptionId || user?.plan === 'guest') {
            // New subscription: no proration needed OR no existing sub to prorate against
            initiatePlanChange(planId);
        } else {
            // Existing subscription: show proration preview first
            setProrationModal({ isOpen: true, targetPlanId: planId, preview: null });
            
            try {
                const res = await authFetch('/api/plans/proration-preview', {
                    method: 'POST',
                    body: JSON.stringify({ planId })
                });
                const { preview } = await res.json();
                
                if (!preview) {
                    // Fallback: if proration fails but they have a sub ID (should be rare), go to checkout
                    initiatePlanChange(planId);
                    return;
                }

                setProrationModal(prev => ({ ...prev, preview }));
            } catch (error) {
                console.error('Failed to fetch proration preview:', error);
                // Fallback to avoid soft-locking the modal
                initiatePlanChange(planId);
            }
        }
    };

    const initiatePlanChange = async (planId: string) => {
        setActionLoading(planId);
        try {
            const res = await authFetch('/api/plans/change', {
                method: 'POST',
                body: JSON.stringify({ planId })
            });
            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (error) {
            console.error('Plan change failed:', error);
        } finally {
            setActionLoading(null);
            setProrationModal({ isOpen: false, targetPlanId: '', preview: null });
        }
    };

    const handleOpenPortal = async () => {
        setActionLoading('portal');
        try {
            const res = await authFetch('/api/billing/portal', { method: 'POST' });
            const { url, error } = await res.json();
            if (url) {
                window.location.href = url;
            } else {
                alert(`Portal access failed: ${error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Portal failed:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancelSubscription = async () => {
        if (!confirm('Are you sure you want to cancel? Your premium features will remain active until the end of the current billing cycle.')) return;
        
        setActionLoading('cancel');
        try {
            await authFetch('/api/plans/cancel', { method: 'POST' });
            alert('Cancellation initiated successfully.');
            refreshData();
        } catch (error) {
            console.error('Cancellation failed:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSaveAutoRefill = async (settings: { enabled: boolean, threshold: number, packSize: number }) => {
        try {
            await authFetch('/api/credits/auto-refill', {
                method: 'PUT',
                body: JSON.stringify(settings)
            });
            alert('Auto-refill settings persisted.');
        } catch (error) {
            console.error('Failed to save auto-refill:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <span className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] animate-pulse">Establishing Secure Hub...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pb-24">
            {/* Header Section */}
            <div className="relative pt-20 pb-12 px-6 border-b border-slate-900 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-600/5 to-transparent pointer-events-none" />
                <div className="max-w-6xl mx-auto relative">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-indigo-400">
                                <Sparkles className="w-5 h-5" />
                                <span className="text-xs font-black uppercase tracking-[0.3em]">Capital & Strategy</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter">Billing Hub</h1>
                            <p className="max-w-xl text-slate-500 font-medium leading-relaxed">
                                Manage your strategic AI capacity, subscription tiers, and audit your synthesis operations across the documentary ecosystem.
                            </p>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
                            {[
                                { id: 'plan', label: 'My Plan', icon: Shield },
                                { id: 'credits', label: 'Credits', icon: CreditCard },
                                { id: 'history', label: 'History', icon: History }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as Tab)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                                        activeTab === tab.id 
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                        : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Areas */}
            <main className="max-w-6xl mx-auto px-6 mt-12">
                
                {/* MY PLAN TAB */}
                {activeTab === 'plan' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {currentPlanDef && (
                            <CurrentPlanCard
                                planId={user?.plan || 'guest'}
                                planDef={currentPlanDef}
                                status={user?.subscriptionStatus || 'none'}
                                expiresAt={user?.planExpiresAt}
                                onManageBilling={handleOpenPortal}
                            />
                        )}

                        <div className="space-y-8">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] border-l-2 border-indigo-500 pl-4">Available Strategic Tiers</h3>
                            <PlanComparisonGrid 
                                plans={PRICING_CONFIG.plans}
                                currentPlanId={user?.plan || 'guest'}
                                onUpgrade={handleUpgradeTrigger}
                                onCancel={handleCancelSubscription}
                                isLoading={actionLoading}
                            />
                        </div>
                    </div>
                )}

                {/* CREDITS TAB */}
                {activeTab === 'credits' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <CreditBalanceCard
                            balance={user?.creditBalance ?? 0}
                            planTier={user?.plan || 'Standard'}
                            onBuyCredits={() => {}} // Scroll to packs below
                        />

                        <div className="space-y-8">
                             <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] border-l-2 border-indigo-500 pl-4">One-Time Reinforcements</h3>
                             <CreditPackCards 
                                packs={PRICING_CONFIG.creditPacks}
                                onPurchase={handleBuyPack}
                                isLoading={actionLoading}
                             />
                        </div>

                        <div className="space-y-8">
                             <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] border-l-2 border-indigo-500 pl-4">Auto-Refill Configuration</h3>
                             <AutoRefillSettings
                                initialEnabled={user?.autoRefill?.enabled || false}
                                initialThreshold={user?.autoRefill?.threshold || 10}
                                initialPackSize={user?.autoRefill?.packSize || 100}
                                onSave={handleSaveAutoRefill}
                             />
                        </div>
                    </div>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-8">
                             <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] border-l-2 border-indigo-500 pl-4">Resource Consumption History</h3>
                             <TransactionTable transactions={transactions} />
                        </div>
                        
                        {planHistory.length > 0 && (
                            <div className="space-y-8">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] border-l-2 border-indigo-500 pl-4">Tier Alignment History</h3>
                                <div className="space-y-4">
                                    {planHistory.map(record => (
                                        <div key={record.id} className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-slate-800 rounded-xl text-indigo-400">
                                                    <History className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold uppercase tracking-wider text-xs">
                                                        {record.previousPlan} <ArrowRight className="inline w-3 h-3 mx-2 opacity-30" /> {record.newPlan}
                                                    </p>
                                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{record.changeType}</p>
                                                </div>
                                            </div>
                                            <span className="text-slate-400 text-xs font-bold">{new Date(record.effectiveAt).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </main>

            {/* Proration Preview Modal */}
            <ProrationPreviewModal
                isOpen={prorationModal.isOpen}
                onClose={() => setProrationModal({ isOpen: false, targetPlanId: '', preview: null })}
                onConfirm={() => initiatePlanChange(prorationModal.targetPlanId)}
                preview={prorationModal.preview}
                targetPlanName={PRICING_CONFIG.plans.find(p => p.id === prorationModal.targetPlanId)?.displayName || ''}
                isLoading={actionLoading === prorationModal.targetPlanId}
            />
        </div>
    );
}
