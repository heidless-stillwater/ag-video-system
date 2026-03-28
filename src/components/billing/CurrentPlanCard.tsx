'use client';

import React from 'react';
import { Calendar, Crown, Shield, Zap, User as UserIcon, LucideIcon, ArrowRightCircle } from 'lucide-react';
import { PlanDefinition } from '@/types';

interface CurrentPlanCardProps {
    planId: string;
    planDef: PlanDefinition;
    status: string;
    expiresAt?: Date | string | null;
    onManageBilling: () => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
    'guest': UserIcon,
    'trial': Zap,
    'standard': Shield,
    'premium': Crown,
    'custom': Crown,
};

export const CurrentPlanCard: React.FC<CurrentPlanCardProps> = ({ 
    planId, 
    planDef, 
    status, 
    expiresAt, 
    onManageBilling 
}) => {
    const Icon = ICON_MAP[planId] || Shield;
    const formattedExpiry = expiresAt 
        ? new Date(expiresAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
        : 'Never';

    return (
        <div className="relative overflow-hidden bg-slate-900/60 rounded-3xl border border-slate-800 p-8 backdrop-blur-3xl group">
            {/* Background Glow */}
            <div className={`absolute -top-24 -left-24 w-64 h-64 blur-[100px] rounded-full pointer-events-none opacity-20 transition-all duration-500 ${
                planId === 'premium' ? 'bg-purple-600 group-hover:bg-purple-500' : 'bg-indigo-600 group-hover:bg-indigo-500'
            }`} />
            
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-start gap-6">
                    <div className={`p-5 rounded-3xl ${
                        planId === 'premium' 
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                        <Icon className="w-10 h-10" />
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight">{planDef.displayName}</h2>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                status === 'active' || status === 'trialing'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-slate-800 text-slate-500 border-slate-700'
                            }`}>
                                {status || 'Inactive'}
                            </span>
                        </div>
                        <p className="text-slate-500 font-medium text-sm">
                            Strategic tier established {planDef.creditMultiplier < 1.0 ? `with ${Math.round((1 - planDef.creditMultiplier) * 100)}% efficiency bonus.` : 'for standard synthesis.'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:items-end gap-6">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <div className="flex flex-col md:items-end">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Contract End Date</span>
                            <span className="text-sm font-bold text-slate-200">{formattedExpiry}</span>
                        </div>
                    </div>

                    <button 
                        onClick={onManageBilling}
                        className="group/btn flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-300 border border-slate-700"
                    >
                        <span>Manage Subscription</span>
                        <ArrowRightCircle className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                </div>
            </div>

            {/* Feature Mini-Grid */}
            <div className="mt-8 pt-8 border-t border-slate-800/50 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">Max Projects</span>
                    <span className="text-white font-bold">{planDef.features.maxProjects === -1 ? 'Unlimited' : planDef.features.maxProjects}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">Render Frequency</span>
                    <span className="text-white font-bold">{planDef.features.maxRendersPerMonth === -1 ? 'Unlimited' : `${planDef.features.maxRendersPerMonth}/mo`}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">Commercial Usage</span>
                    <span className="text-white font-bold">{planDef.features.commercialRights ? 'Authorized' : 'Restricted'}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">Nural Voice Clone</span>
                    <span className="text-white font-bold">{planDef.features.voiceCloning ? 'Enabled' : 'Locked'}</span>
                </div>
            </div>
        </div>
    );
};
