'use client';

import React from 'react';
import { TrendingUp, Users, CreditCard, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Stats {
    totalCredits: number;
    activeSubscriptions: number;
    revenueMonthly: number;
    creditsGrantMonthly: number;
    changeTotalCredits: number; // percentage
    changeActiveSubs: number;
}

interface CreditSystemOverviewProps {
    stats: Stats | null;
    isLoading?: boolean;
}

export const CreditSystemOverview: React.FC<CreditSystemOverviewProps> = ({ stats, isLoading = false }) => {
    if (isLoading || !stats) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 4, 4].map(i => (
                    <div key={i} className="h-32 bg-slate-900 animate-pulse rounded-2xl border border-slate-800" />
                ))}
            </div>
        );
    }

    const cards = [
        { 
            label: 'System Liquidity', 
            value: stats.totalCredits.toLocaleString(), 
            suffix: 'Credits', 
            icon: CreditCard, 
            color: 'text-indigo-400',
            change: stats.changeTotalCredits,
            trend: stats.changeTotalCredits > 0 ? 'up' : 'down'
        },
        { 
            label: 'Active Subscriptions', 
            value: stats.activeSubscriptions.toLocaleString(), 
            suffix: 'Tiers', 
            icon: Users, 
            color: 'text-emerald-400',
            change: stats.changeActiveSubs,
            trend: stats.changeActiveSubs > 0 ? 'up' : 'down'
        },
        { 
            label: 'Monthly Revenue', 
            value: `$${stats.revenueMonthly.toLocaleString()}`, 
            suffix: 'USD', 
            icon: TrendingUp, 
            color: 'text-purple-400',
            change: 12, // Mock change
            trend: 'up'
        },
        { 
            label: 'Monthly Issuance', 
            value: stats.creditsGrantMonthly.toLocaleString(), 
            suffix: 'Credits', 
            icon: Activity, 
            color: 'text-amber-400',
            change: -5, // Mock change
            trend: 'down'
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {cards.map((card, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl group transition-all duration-300 hover:border-slate-700">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 bg-slate-800 rounded-xl ${card.color}`}>
                            <card.icon className="w-5 h-5" />
                        </div>
                        <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${card.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {card.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>{Math.abs(card.change)}%</span>
                        </div>
                    </div>
                    
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{card.label}</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white tabular-nums tracking-tighter">{card.value}</span>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{card.suffix}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};
