import React from 'react';
import { UserPlan, DEFAULT_PLAN_NICKNAMES } from '@/types';

interface PricingCardProps {
    plan: UserPlan;
    price: string;
    features: string[];
    credits: number;
    isCurrentPlan?: boolean;
    onSelect: () => void;
    loading?: boolean;
}

export const PricingCard: React.FC<PricingCardProps> = ({
    plan,
    price,
    features,
    credits,
    isCurrentPlan,
    onSelect,
    loading
}) => {
    const planName = DEFAULT_PLAN_NICKNAMES[plan] 
        ? DEFAULT_PLAN_NICKNAMES[plan].charAt(0).toUpperCase() + DEFAULT_PLAN_NICKNAMES[plan].slice(1)
        : plan.charAt(0).toUpperCase() + plan.slice(1);
    
    // Sub-nickname or description
    const planDetails: Record<UserPlan, string> = {
        guest: 'Basic Exploration',
        trial: 'Initial Research',
        standard: 'Documentary Baseline',
        premium: 'High-Frequency Production',
        custom: 'Enterprise Synthesis'
    };
    return (
        <div className={`p-8 rounded-3xl border-2 transition-all flex flex-col h-full bg-slate-900/50 backdrop-blur-xl ${
            isCurrentPlan 
            ? 'border-indigo-500 shadow-xl shadow-indigo-500/20' 
            : 'border-slate-800 hover:border-slate-700'
        }`}>
            <div className="mb-8">
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-full">
                    {planName}
                </span>
                <p className="mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest italic opacity-60">
                    {planDetails[plan] || 'Standard Profile'}
                </p>
                <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-extrabold text-white">{price}</span>
                    <span className="ml-1 text-slate-400">/mo</span>
                </div>
                <p className="mt-2 text-slate-400 text-sm">
                    {credits} rendering credits included monthly
                </p>
            </div>

            <ul className="space-y-4 mb-8 flex-grow">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-center text-slate-300 text-sm">
                        <svg className="w-5 h-5 text-indigo-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                    </li>
                ))}
            </ul>

            <button
                onClick={onSelect}
                disabled={loading || isCurrentPlan}
                className={`w-full py-3 px-6 rounded-xl font-bold transition-all ${
                    isCurrentPlan
                    ? 'bg-slate-800 text-slate-400 cursor-default'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20 active:scale-[0.98]'
                }`}
            >
                {loading ? 'Processing...' : isCurrentPlan ? 'Current Plan' : 'Upgrade Now'}
            </button>
        </div>
    );
};
