'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth/AuthContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'signup';
    selectedPlanId?: string;
}

export function AuthModal({ isOpen, onClose, initialMode = 'login', selectedPlanId }: AuthModalProps) {
    const { signInWithEmail, signUpWithEmail, signInWithGoogle, isSigningIn } = useAuth();
    const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Update mode when prop changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setError(null);
        }
    }, [isOpen, initialMode]);

    if (!isOpen || !mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (mode === 'login') {
                await signInWithEmail(email, password);
            } else {
                await signUpWithEmail(email, password, name);
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" 
                onClick={onClose}
            />
            
            {/* Modal Wrapper - ensures centering but allows scroll if content > viewport */}
            <div className="flex min-h-full items-center justify-center p-4 text-center">
                {/* Modal Content */}
                <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 text-left">
                    <div className="p-8">
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                                <span className="text-2xl">🎬</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                            </h2>
                            <p className="text-slate-400 text-sm mt-1 text-center">
                                {mode === 'login' ? 'Sign in to continue to Synthesis Studio' : 'Join the science of sleep documentary makers'}
                            </p>

                            {mode === 'signup' && selectedPlanId && (
                                <div className="mt-4 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                        Selected Plan: {selectedPlanId.toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm animate-shake">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {mode === 'signup' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="your name"
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                        required
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    autoComplete="email"
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-indigo-800 disabled:to-purple-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                            >
                                {loading && (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                )}
                                {mode === 'login' ? 'Sign In' : 'Create Account'}
                            </button>
                        </form>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-800"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-slate-900 px-4 text-slate-500 font-bold tracking-widest">or continue with</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                signInWithGoogle().then(() => onClose());
                            }}
                            type="button"
                            disabled={isSigningIn}
                            className="w-full py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                />
                            </svg>
                            Google
                        </button>

                        <div className="mt-8 text-center">
                            <p className="text-slate-500 text-sm">
                                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                                <button
                                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                                    className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                                >
                                    {mode === 'login' ? 'Sign up' : 'Sign in'}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
