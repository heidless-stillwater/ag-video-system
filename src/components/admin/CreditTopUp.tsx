'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { CounterInput } from '@/components/ui/CounterInput';
import { userService } from '@/lib/services/firestore';
import { User } from '@/types';

export function CreditTopUp() {
    const { user: currentUser, authFetch } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [identifier, setIdentifier] = useState('');
    const [amount, setAmount] = useState(10);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingUsers, setIsFetchingUsers] = useState(true);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        async function loadUsers() {
            try {
                const allUsers = await userService.getAllUsers();
                setUsers(allUsers);
                // Default to current user's email if found
                if (currentUser?.email) {
                    setIdentifier(currentUser.email);
                }
            } catch (err) {
                console.error('Failed to load users for top-up tool:', err);
            } finally {
                setIsFetchingUsers(false);
            }
        }
        loadUsers();
    }, [currentUser]);

    const handleTopUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier) return;

        setIsLoading(true);
        setMessage(null);

        try {
            const response = await authFetch('/api/admin/top-up', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ identifier, amount })
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ text: data.message, type: 'success' });
            } else {
                setMessage({ text: data.error || 'Failed to top up credits', type: 'error' });
            }
        } catch (error: any) {
            setMessage({ text: error.message || 'An unexpected error occurred', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-700/20 rounded-xl p-6 border border-emerald-500/20">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                💰 Credit Top-Up Tool
            </h2>
            <p className="text-slate-400 text-sm mb-6 font-medium italic">
                Directly add credits to any user balance in the system.
            </p>

            <form onSubmit={handleTopUp} className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">
                            Target User Identity
                        </label>
                        {isFetchingUsers ? (
                            <div className="h-11 bg-slate-900/50 animate-pulse rounded-lg border border-white/5"></div>
                        ) : (
                            <select
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full h-11 bg-slate-900 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none font-medium"
                                required
                            >
                                <option value="" disabled className="text-slate-600">Select recipient...</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.email || u.id} className="bg-slate-900 py-2">
                                        {u.displayName} ({u.email || u.id}) {u.id === currentUser?.id ? '[YOU]' : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="w-full md:w-32">
                        <CounterInput
                            label="Amount"
                            value={amount}
                            onChange={(val) => setAmount(val)}
                            min={1}
                            max={5000}
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <button
                            type="submit"
                            disabled={isLoading || isFetchingUsers || !identifier || amount <= 0}
                            className="w-full px-8 h-11 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded-lg font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10 active:scale-95 text-xs"
                        >
                            {isLoading ? 'SYNCING...' : 'DISPENSE_CREDITS'}
                        </button>
                    </div>
                </div>
            </form>

            {message && (
                <div className={`mt-6 p-4 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2 duration-300 ${
                    message.type === 'success' 
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                }`}>
                    {message.text}
                </div>
            )}
            
            <p className="text-[10px] text-slate-500 mt-6 italic bg-black/20 p-2 rounded inline-block">
                PROTOCOL NOTE: Credit dispensation is logged for audit purposes. Ensure target identity is correct before execution.
            </p>
        </div>
    );
}
