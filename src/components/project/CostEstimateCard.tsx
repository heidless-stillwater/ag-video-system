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
                <div className="flex justify-between text-gray-400">
                    <span>Script Generation (AI)</span>
                    <span>{formatCost(estimate.scriptGeneration)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                    <span>Voice Synthesis (TTS)</span>
                    <span>{formatCost(estimate.voiceGeneration)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                    <span>Video Assembly (Render)</span>
                    <span>{formatCost(estimate.videoAssembly)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                    <span>Storage (Monthly)</span>
                    <span>{formatCost(estimate.storage)}</span>
                </div>

                <div className="border-t border-gray-700 pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                        <span className="text-gray-200">Total</span>
                        <span className={getTotalColor()}>{formatCost(estimate.total)}</span>
                    </div>
                </div>
            </div>

            {estimate.total > 0.50 && (
                <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-700/50 rounded text-xs text-yellow-300">
                    ⚠️ This render may use significant Free Trial credits.
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

export function RenderConfirmModal({ isOpen, estimate, onConfirm, onCancel }: RenderConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white">Confirm Render</h3>
                </div>

                <p className="text-gray-300 mb-4">
                    This render will use approximately <span className="font-bold text-yellow-400">${estimate.total.toFixed(2)}</span> of your Free Trial credits.
                </p>

                <div className="bg-gray-900/50 rounded-lg p-3 mb-4 text-sm">
                    <div className="flex justify-between text-gray-400 mb-1">
                        <span>AI Script</span><span>${estimate.scriptGeneration.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 mb-1">
                        <span>Voice</span><span>${estimate.voiceGeneration.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 mb-1">
                        <span>Video</span><span>${estimate.videoAssembly.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                        <span>Storage</span><span>${estimate.storage.toFixed(2)}</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg transition-colors font-semibold"
                    >
                        Proceed
                    </button>
                </div>
            </div>
        </div>
    );
}
