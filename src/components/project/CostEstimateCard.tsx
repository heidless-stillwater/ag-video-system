'use client';

import { useEffect, useState } from 'react';
import { estimateCost, CostEstimate, getEnvironmentMode } from '@/lib/config/environment';

interface CostEstimateCardProps {
    scriptCharCount: number;
    estimatedDurationMinutes: number;
    className?: string;
}

export function CostEstimateCard({
    scriptCharCount,
    estimatedDurationMinutes,
    className = ''
}: CostEstimateCardProps) {
    const [estimate, setEstimate] = useState<CostEstimate | null>(null);
    const [mode, setMode] = useState<string>('');

    useEffect(() => {
        const envMode = getEnvironmentMode();
        setMode(envMode);

        if (scriptCharCount > 0 || estimatedDurationMinutes > 0) {
            const cost = estimateCost(scriptCharCount, estimatedDurationMinutes, envMode);
            setEstimate(cost);
        } else {
            setEstimate(null);
        }
    }, [scriptCharCount, estimatedDurationMinutes]);

    if (!estimate) {
        return null;
    }

    const formatCost = (value: number) => {
        if (value < 0.01) return '<$0.01';
        return `$${value.toFixed(2)}`;
    };

    const getTotalColor = () => {
        if (estimate.total < 0.10) return 'text-green-400';
        if (estimate.total < 0.50) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className={`bg-gray-800/50 border border-gray-700 rounded-lg p-4 ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Estimated Cost
                </h4>
                <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">
                    {mode}
                </span>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between font-semibold mb-2">
                    <span className="text-gray-200">Processing Cost</span>
                    <span className="text-purple-400 font-bold">{estimate.credits} Credits</span>
                </div>
                <div className="flex justify-between text-gray-500 text-[10px] uppercase tracking-wider mb-1">
                    <span>USD Breakdown (Internal)</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs">
                    <span>Script Generation (AI)</span>
                    <span>{formatCost(estimate.scriptGeneration)}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs">
                    <span>Voice Synthesis (TTS)</span>
                    <span>{formatCost(estimate.voiceGeneration)}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs">
                    <span>Video Assembly (Render)</span>
                    <span>{formatCost(estimate.videoAssembly)}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs text-xs">
                    <span>Storage (Monthly)</span>
                    <span>{formatCost(estimate.storage)}</span>
                </div>

                <div className="border-t border-gray-700 pt-2 mt-2">
                    <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-400">Est. Total (Dev Only)</span>
                        <span className={getTotalColor()}>{formatCost(estimate.total)}</span>
                    </div>
                </div>
            </div>

            {estimate.credits > 2 && (
                <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-700/50 rounded text-[10px] text-yellow-300">
                    ⚠️ This long project requires {estimate.credits} credits.
                </div>
            )}


            <div className="mt-3 text-xs text-gray-500">
                Based on {scriptCharCount.toLocaleString()} chars, ~{estimatedDurationMinutes} min video
            </div>
        </div>
    );
}

interface RenderConfirmModalProps {
    isOpen: boolean;
    estimate: CostEstimate;
    onConfirm: () => void;
    onCancel: () => void;
}

import { useAuth } from '@/lib/auth/AuthContext';
import Link from 'next/link';

export function RenderConfirmModal({ isOpen, estimate, onConfirm, onCancel }: RenderConfirmModalProps) {
    const { user } = useAuth();
    if (!isOpen) return null;

    const creditBalance = user?.creditBalance ?? 0;
    const hasEnoughCredits = creditBalance >= estimate.credits;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 ${hasEnoughCredits ? 'bg-purple-500/20' : 'bg-red-500/20'} rounded-full flex items-center justify-center`}>
                        <svg className={`w-5 h-5 ${hasEnoughCredits ? 'text-purple-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                        {hasEnoughCredits ? 'Confirm Render' : 'Insufficient Credits'}
                    </h3>
                </div>

                <div className="space-y-4 mb-6">
                    <p className="text-gray-300 text-sm">
                        This render will consume <span className="font-bold text-purple-400">{estimate.credits} Credits</span>.
                    </p>

                    <div className="bg-gray-900/50 rounded-lg p-4 flex justify-between items-center">
                        <div className="text-sm text-gray-400">Your Current Balance</div>
                        <div className={`text-xl font-bold ${hasEnoughCredits ? 'text-white' : 'text-red-400'}`}>
                            {creditBalance} Credits
                        </div>
                    </div>

                    {!hasEnoughCredits && (
                        <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3 text-red-300 text-xs">
                            You need {estimate.credits - creditBalance} more credits to render this project.
                            Standard plans include 10 credits/month.
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                            Back
                        </button>
                        {hasEnoughCredits ? (
                            <button
                                onClick={onConfirm}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg transition-all font-semibold shadow-lg shadow-purple-500/20"
                            >
                                Start Render
                            </button>
                        ) : (
                            <Link
                                href="/billing"
                                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all font-semibold text-center shadow-lg shadow-purple-500/20"
                            >
                                Upgrade Plan
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

