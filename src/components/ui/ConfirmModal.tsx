'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
    singleButton?: boolean;
    children?: React.ReactNode;
}

/**
 * A cinematic, high-fidelity confirmation modal.
 * Features a glassmorphism design with a dark backdrop blur.
 * Uses React Portal to ensure it renders on top of the entire application.
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
    singleButton = false,
    children,
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

    // Use Portal to render directly in body, bypassing parent z-indexes/overflows
    return createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
            <div className="min-h-screen px-4 text-center flex items-center justify-center">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                    aria-hidden="true"
                    onClick={onClose}
                />

                {/* This element is to trick the browser into centering the modal contents. */}
                <span className="inline-block h-screen align-middle" aria-hidden="true">
                    &#8203;
                </span>

                {/* Modal Content */}
                <div className="relative inline-block w-full max-w-md p-0 my-8 overflow-hidden text-left align-middle transition-all transform bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
                    {/* Visual Accent */}
                    <div className={`absolute top-0 inset-x-0 h-1 flex-shrink-0 ${isDestructive ? 'bg-red-500' : 'bg-blue-500'}`}></div>

                    <div className="p-8">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl ${isDestructive ? 'bg-red-500/10' : 'bg-blue-500/10'
                                }`}>
                                {isDestructive ? '⚠️' : (singleButton ? 'ℹ️' : '❓')}
                            </div>
                            <h3 className="text-xl font-bold text-white leading-6">{title}</h3>
                        </div>

                        <div className="mt-2">
                            <p className="text-sm text-slate-400 leading-relaxed">
                                {message}
                            </p>
                        </div>

                        {children && <div className="mt-6">{children}</div>}

                        <div className="flex items-center gap-3 mt-8">
                            {!singleButton && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                                >
                                    {cancelLabel}
                                </button>
                            )}
                            <button
                                type="button"
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
        </div>,
        document.body
    );
};
