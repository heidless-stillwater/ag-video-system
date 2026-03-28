'use client';

import React, { useState } from 'react';
import { Settings, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface AutoRefillSettingsProps {
    initialEnabled: boolean;
    initialThreshold: number;
    initialPackSize: number;
    onSave: (settings: { enabled: boolean; threshold: number; packSize: number }) => Promise<void>;
}

export const AutoRefillSettings: React.FC<AutoRefillSettingsProps> = ({
    initialEnabled,
    initialThreshold,
    initialPackSize,
    onSave
}) => {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [threshold, setThreshold] = useState(initialThreshold);
    const [packSize, setPackSize] = useState(initialPackSize);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({ enabled, threshold, packSize });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-8 backdrop-blur-3xl overflow-hidden relative group">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
            
            <div className="relative flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                        <RefreshCw className={`w-6 h-6 text-indigo-400 ${enabled ? 'animate-spin-slow' : ''}`} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-wider">Strategic Auto-Refill</h3>
                        <p className="text-sm text-slate-500 font-medium">Never interrupt a synthesis session again.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <span className={`text-xs font-black uppercase tracking-widest ${enabled ? 'text-indigo-400' : 'text-slate-600'}`}>
                        {enabled ? 'Active' : 'Disabled'}
                    </span>
                    <button 
                        onClick={() => setEnabled(!enabled)}
                        className={`relative w-16 h-8 rounded-full transition-all duration-300 ${
                            enabled ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.3)]' : 'bg-slate-800'
                        }`}
                    >
                        <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-xl ${
                            enabled ? 'translate-x-8' : 'translate-x-0'
                        }`} />
                    </button>
                </div>
            </div>

            <div className={`space-y-8 transition-opacity duration-300 ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Recharge Threshold</label>
                            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{threshold} Credits</span>
                        </div>
                        <input 
                            type="range"
                            min="5"
                            max="100"
                            step="5"
                            value={threshold}
                            onChange={(e) => setThreshold(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                        />
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider leading-relaxed">
                            Payment triggers automatically when balance reaches this depth.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Refill Magnitude</label>
                            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{packSize} Credits</span>
                        </div>
                        <input 
                            type="range"
                            min="100"
                            max="1000"
                            step="100"
                            value={packSize}
                            onChange={(e) => setPackSize(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                        />
                         <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider leading-relaxed">
                            Credits added to account per auto-recharge event.
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800/80 flex items-start gap-4">
                    <ShieldCheck className="w-5 h-5 text-indigo-500/50 mt-1 shrink-0" />
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Securely charged to your primary payment method. Auto-refill uses <span className="text-slate-300 font-bold">off-session strategic clearance</span> to prevent session interruptions during rendering or bulk synthesis.
                    </p>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-8 py-3 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-50 transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Settings className="w-3 h-3" />}
                    <span>Commit Settings</span>
                </button>
            </div>
        </div>
    );
};
