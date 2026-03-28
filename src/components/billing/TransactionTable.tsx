'use client';

import React from 'react';
import { CreditTransaction } from '@/types';
import { ArrowDownLeft, ArrowUpRight, Clock, Hash, Tag, MoreHorizontal } from 'lucide-react';

interface TransactionTableProps {
    transactions: CreditTransaction[];
    isLoading?: boolean;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, isLoading = false }) => {
    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 animate-pulse">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-20 bg-slate-900/50 rounded-2xl border border-slate-800" />
                ))}
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-slate-950/20 rounded-3xl border border-dashed border-slate-800">
                <div className="p-4 bg-slate-900 rounded-full mb-4">
                    <Clock className="w-8 h-8 text-slate-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-400">No transactions recorded yet.</h3>
                <p className="text-slate-600 mt-2 font-medium">Your synthesis activities will appear here.</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-3">
            {transactions.map((tx) => (
                <div 
                    key={tx.id} 
                    className="group relative flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-md transition-all duration-300 hover:border-slate-500/30 hover:bg-slate-900/60"
                >
                    <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className={`p-3 rounded-2xl transition-colors ${
                            tx.type === 'purchase' || tx.type === 'grant' || tx.type === 'admin-topup' || tx.type === 'plan-bonus'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                            {tx.amount > 0 ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        
                        <div className="space-y-1 overflow-hidden">
                            <h4 className="text-white font-bold tracking-tight uppercase tracking-widest text-xs flex items-center gap-2">
                                <Tag className="w-3 h-3 opacity-50 text-indigo-400" />
                                {tx.metadata?.reason || tx.type.replace('-', ' ')}
                            </h4>
                            <p className="text-slate-500 text-sm font-medium truncate max-w-[300px]">
                                {tx.metadata?.description || `Credits ${tx.amount > 0 ? 'added' : 'deducted'} from account.`}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 md:mt-0 flex items-center gap-8 w-full md:w-auto justify-between">
                        <div className="flex flex-col items-end">
                            <span className={`text-xl font-black tabular-nums transition-colors ${
                                tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                                {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()}
                            </span>
                            <span className="text-slate-600 text-[10px] uppercase font-heavy tracking-widest mt-1">
                                CR Balance: {tx.balanceAfter.toLocaleString()}
                            </span>
                        </div>
                        
                        <div className="flex flex-col items-end min-w-[120px]">
                            <span className="text-slate-300 text-sm font-bold">
                                {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-slate-600 text-[10px] uppercase font-bold tracking-wider mt-1">
                                {new Date(tx.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        
                        <button className="hidden md:flex p-2 bg-slate-800/20 rounded-lg border border-transparent hover:border-slate-700 text-slate-600 hover:text-white transition-all duration-300">
                             <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
