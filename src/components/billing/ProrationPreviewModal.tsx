'use client';

import React from 'react';
import { X, ArrowRight, Info, CreditCard, RefreshCw } from 'lucide-react';

interface ProrationPreview {
    amount: number;
    currency: string;
    nextInvoiceDate: number;
    description: string;
}

interface ProrationPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    preview: ProrationPreview | null;
    targetPlanName: string;
    isLoading?: boolean;
}

export const ProrationPreviewModal: React.FC<ProrationPreviewModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    preview,
    targetPlanName,
    isLoading = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
            
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                
                <div className="p-8">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Review Changes</h3>
                            <p className="text-slate-500 font-medium text-sm mt-1">Review your strategic alignment adjustment.</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                    <RefreshCw className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">New Designation</span>
                            </div>
                            <span className="text-white font-black uppercase tracking-tight">{targetPlanName}</span>
                        </div>

                        {preview ? (
                            <div className="space-y-4">
                                <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Immediate Charge</span>
                                        <span className="text-2xl font-black text-white tabular-nums">
                                            ${(preview.amount / 100).toFixed(2)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed italic">
                                        {preview.description || 'Adjustment covers remaining cycle duration and immediate upgrade activation.'}
                                    </p>
                                </div>

                                <div className="flex items-start gap-3 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                                    <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                        Your next full billing cycle will begin on <span className="text-slate-300 font-bold">{new Date(preview.nextInvoiceDate * 1000).toLocaleDateString()}</span> for the standard rate of this tier.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center space-y-4">
                                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                                <span className="text-xs font-black text-indigo-500 uppercase tracking-widest animate-pulse">Calculating Adjustment...</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-4">
                        <button 
                            onClick={onClose}
                            className="py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-300"
                        >
                            Abort
                        </button>
                        <button 
                            onClick={onConfirm}
                            disabled={!preview || isLoading}
                            className="py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/20 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 group/btn"
                        >
                            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                            <span>Commit Change</span>
                            {!isLoading && <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
