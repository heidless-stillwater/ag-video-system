import React from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import Link from 'next/link';

export const CreditBalanceDashboard: React.FC = () => {
    const { user } = useAuth();
    
    // In a real app, this would be computed based on the user's plan limits
    const maxCredits = user?.plan === 'premium' ? 30 : user?.plan === 'standard' ? 10 : 5;
    const currentCredits = user?.creditBalance ?? 0;
    const percentage = Math.max(0, Math.min(100, (currentCredits / maxCredits) * 100));

    return (
        <div className="flex items-center gap-4 bg-slate-800/20 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/50">
            <div className="flex flex-col">
                <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="text-slate-400 text-xs font-medium">Credits:</span>
                    <span className="text-white text-xs font-mono font-bold">
                        {currentCredits} / {maxCredits}
                    </span>
                </div>
                <div className="w-32 h-1.5 bg-slate-700/50 rounded-full overflow-hidden shadow-inner">
                    <div
                        className={`h-full bg-gradient-to-r transition-all duration-500 ease-out ${
                            currentCredits === 0 
                            ? 'from-rose-600 to-rose-400' 
                            : currentCredits < 5 
                            ? 'from-amber-600 to-amber-400' 
                            : 'from-indigo-600 to-emerald-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
            </div>
            
            <Link 
                href="/settings/billing"
                className="group p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                title="Top up credits"
            >
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all transform group-active:scale-90">
                    <span className="text-xs">＋</span>
                </div>
            </Link>
        </div>
    );
};
