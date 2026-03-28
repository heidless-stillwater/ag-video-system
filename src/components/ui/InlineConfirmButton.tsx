'use client';

import React, { useState, useEffect } from 'react';

interface InlineConfirmButtonProps {
    label: string | React.ReactNode;
    confirmLabel?: string;
    onConfirm: () => void;
    isLoading?: boolean;
    isDestructive?: boolean;
    className?: string;
    timeout?: number;
}

/**
 * A cinematic inline confirmation button that transforms when clicked.
 * Avoids the need for full-screen modals for simple destructive actions.
 */
export const InlineConfirmButton: React.FC<InlineConfirmButtonProps> = ({
    label,
    confirmLabel = 'Confirm',
    onConfirm,
    isLoading = false,
    isDestructive = true,
    className = "",
    timeout = 5000,
}) => {
    const [isConfirming, setIsConfirming] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isConfirming) {
            timer = setTimeout(() => setIsConfirming(false), timeout);
        }
        return () => clearTimeout(timer);
    }, [isConfirming, timeout]);

    if (isConfirming) {
        return (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">Are you sure?</span>
                <div className="flex items-center bg-slate-900 border border-slate-700/50 rounded-lg overflow-hidden group">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onConfirm();
                            setIsConfirming(false);
                        }}
                        disabled={isLoading}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${isDestructive
                                ? "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white"
                                : "bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white"
                            }`}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin"></span>
                                ...
                            </span>
                        ) : confirmLabel}
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsConfirming(false);
                        }}
                        disabled={isLoading}
                        className="px-2 py-1.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all border-l border-slate-700/50"
                        title="Cancel"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsConfirming(true);
            }}
            disabled={isLoading}
            className={className}
        >
            {label}
        </button>
    );
};
