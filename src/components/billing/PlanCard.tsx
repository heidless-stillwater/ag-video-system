'use client';

import React from 'react';
import { CheckCircle2, Crown, Zap, Shield, User as UserIcon, LucideIcon } from 'lucide-react';
import { PlanDefinition } from '@/types';

interface PlanCardProps {
    plan: PlanDefinition;
    isCurrent: boolean;
    isFeatured?: boolean;
    onUpgrade: (planId: string) => void;
    onCancel: (planId: string) => void;
    isLoading?: boolean;
}

const ICON_MAP: Record<string, LucideIcon> = {
    'guest': UserIcon,
    'trial': Zap,
    'standard': Shield,
    'premium': Crown,
    'custom': Zap,
};

export const PlanCard: React.FC<PlanCardProps> = ({ 
    plan, 
    isCurrent, 
    isFeatured = false, 
    onUpgrade, 
    onCancel,
    isLoading = false 
}) => {
    const Icon = ICON_MAP[plan.id] || Zap;
    
    return (
        <div className={`relative group p-1 rounded-3xl overflow-hidden transition-all duration-500 scale-100 ${
            isFeatured ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_30px_rgba(79,70,229,0.3)]' : 'bg-slate-800/50 hover:bg-slate-800 shadow-xl'
        } ${isCurrent ? 'ring-2 ring-indigo-500' : ''}`}>
            {/* Inner Content Glass */}
            <div className="relative h-full bg-slate-900/95 rounded-[22px] p-8 flex flex-col">
                <div className="flex justify-between items-start mb-8">
                    <div className={`p-4 rounded-2xl ${isFeatured ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Icon className="w-8 h-8" />
                    </div>
                    {isCurrent && (
                        <span className="px-4 py-1.5 bg-indigo-500/20 text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-500/30">
                            Active Plan
                        </span>
                    )}
                </div>

                <div className="mb-8">
                    <h3 className="text-2xl font-black text-white tracking-tight mb-2 uppercase tracking-wide">
                        {plan.displayName}
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-white tracking-tighter">${plan.priceUsd}</span>
                        <span className="text-slate-500 font-semibold">/ month</span>
                    </div>
                    <p className="mt-4 text-sm text-slate-400 font-medium leading-relaxed">
                        {plan.creditMultiplier < 1.0 ? `${Math.round((1 - plan.creditMultiplier) * 100)}% cheaper actions active.` : 'Standard action costs apply.'}
                    </p>
                </div>

                <ul className="space-y-4 mb-12 flex-grow">
                    {Object.entries(plan.features).map(([key, value], idx) => (
                        <li key={idx} className="flex items-start gap-3">
                            <CheckCircle2 className={`w-5 h-5 mt-0.5 shrink-0 transition-colors ${value ? 'text-indigo-400' : 'text-slate-700 opacity-20'}`} />
                            <span className={`text-sm font-medium ${value ? 'text-slate-300' : 'text-slate-600 line-through decoration-slate-800'}`}>
                                {formatFeatureLabel(key, value)}
                            </span>
                        </li>
                    ))}
                </ul>

                <div className="space-y-4">
                    {!isCurrent ? (
                        <button 
                            onClick={() => onUpgrade(plan.id)}
                            disabled={isLoading}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all duration-300 transform active:scale-95 ${
                                isFeatured 
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
                                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                            } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            {isLoading ? 'Processing...' : 'Activate Plan'}
                        </button>
                    ) : (
                        <button 
                            onClick={() => onCancel(plan.id)}
                            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-slate-500 hover:text-red-400 hover:bg-red-400/5 border border-slate-800 hover:border-red-400/20 transition-all duration-300"
                        >
                            Cancel Subscription
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

function formatFeatureLabel(key: string, value: any): string {
    const labels: Record<string, string> = {
        maxProjects: 'Project Limit',
        maxRendersPerMonth: 'Monthly Render Limit',
        voiceCloning: 'Nural Voice Cloning',
        commercialRights: 'Commercial Assets Rights',
        priorityRendering: 'Priority Server Queue',
        watermarkFree: 'Watermark-Free Exports',
        stagingMode: 'Staging Environment Access',
        apiAccess: 'Strategic API Hub',
    };
    
    let label = labels[key] || key;
    if (typeof value === 'number') {
        return value === -1 ? `Unlimited ${label}` : `${value} ${label}`;
    }
    return label;
}
