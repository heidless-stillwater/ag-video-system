'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'warning' | 'primary';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirm',
    confirmVariant = 'primary',
}) => {
    const variantColors = {
        primary: 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20',
        warning: 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20',
        danger:  'bg-red-600 hover:bg-red-500 shadow-red-500/20',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-[101] pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                                <div className="flex items-center gap-2 text-white font-bold">
                                    <AlertCircle size={18} className="text-amber-400" />
                                    <span>{title}</span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1 text-slate-500 hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="px-6 py-6 text-slate-400 text-sm leading-relaxed">
                                {description}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-slate-950/50 flex items-center justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { onConfirm(); onClose(); }}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold text-white shadow-lg transition-all active:scale-95 ${variantColors[confirmVariant]}`}
                                >
                                    {confirmLabel}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
