'use client';

import React, { useEffect, useState } from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/**
 * A cinematic, high-fidelity confirmation modal.
 * Features a glassmorphism design with a dark backdrop blur.
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDestructive = false,
    isLoading = false,
    onConfirm,
    onClose,
}) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (typeof window !== 'undefined') {
            if (isOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = 'auto';
            }
        }
        return () => {
            if (typeof window !== 'undefined') {
                document.body.style.overflow = 'auto';
            }
        };
    }, [isOpen]);

    if (!isMounted || !isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] overflow-y-auto flex items-center justify-center p-4 py-8">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Visual Accent */}
                <div className={`absolute top-0 inset-x-0 h-1 flex-shrink-0 ${isDestructive ? 'bg-red-500' : 'bg-blue-500'}`}></div>

                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl ${isDestructive ? 'bg-red-500/10' : 'bg-blue-500/10'
                            }`}>
                            {isDestructive ? '⚠️' : '❓'}
                        </div>
                        <h3 className="text-xl font-bold text-white">{title}</h3>
                    </div>

                    <p className="text-slate-400 leading-relaxed mb-8">
                        {message}
                    </p>

                    <div className="flex items-center gap-3 mt-auto">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${isDestructive
                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                                } disabled:opacity-50`}
                        >
                            {isLoading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                confirmLabel
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
