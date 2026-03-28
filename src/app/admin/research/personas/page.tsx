'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { RoleGuard } from '@/components/auth/RoleGuard';
import Link from 'next/link';
import { PersonaDoc } from '@/lib/services/persona-service';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

function PersonaManagerContent() {
    const { firebaseUser, authFetch } = useAuth();
    const [personas, setPersonas] = useState<PersonaDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [editingPersona, setEditingPersona] = useState<Partial<PersonaDoc> | null>(null);
    const [deletePersonaId, setDeletePersonaId] = useState<string | null>(null);
    const [isSeeding, setIsSeeding] = useState(false);

    useEffect(() => {
        if (firebaseUser) {
            fetchPersonas();
        }
    }, [firebaseUser]);

    const fetchPersonas = async () => {
        setLoading(true);
        try {
            const res = await authFetch('/api/research/personas');
            const data = await res.json();
            if (data.success) {
                setPersonas(data.personas);
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPersona?.id || !editingPersona?.name) return;

        try {
            const res = await authFetch('/api/research/personas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingPersona)
            });
            const data = await res.json();
            if (data.success) {
                setMessage('✅ Persona saved successfully');
                setEditingPersona(null);
                fetchPersonas();
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletePersonaId(id);
    };

    const confirmDelete = async () => {
        if (!deletePersonaId) return;

        try {
            const id = deletePersonaId;
            setDeletePersonaId(null);
            const res = await authFetch(`/api/research/personas/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setMessage('✅ Persona deleted');
                fetchPersonas();
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        }
    };

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            const res = await authFetch('/api/admin/seed-personas', { method: 'POST' });
            const data = await res.json();
            setMessage(data.message || '✅ Seeding complete');
            fetchPersonas();
        } catch (error: any) {
            setMessage(`❌ Seeding failed: ${error.message}`);
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8 pt-24">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">🤖 Research Persona Manager</h1>
                        <p className="text-slate-400">Configure specialized agents for the TARE engine</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleSeed}
                            disabled={isSeeding}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {isSeeding ? 'Seeding...' : '♻️ Reset Defaults'}
                        </button>
                        <button 
                            onClick={() => setEditingPersona({ isEnabled: true, isCustom: true })}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                        >
                            + New Persona
                        </button>
                        <Link href="/admin/tools" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors">
                            ← Back
                        </Link>
                    </div>
                </div>

                {message && (
                    <div className={`p-4 rounded-lg mb-6 ${message.includes('❌') ? 'bg-red-900/20 border border-red-500/30' : 'bg-green-900/20 border border-green-500/30'}`}>
                        {message}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <p>Loading personas...</p>
                    ) : personas.map(p => (
                        <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-blue-500/50 transition-colors group">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-xl font-bold text-white">{p.name}</h3>
                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${p.isEnabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                    {p.isEnabled ? 'Active' : 'Disabled'}
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm line-clamp-3 mb-4 h-15">
                                {p.prompt}
                            </p>
                            <div className="flex justify-between items-center text-xs text-slate-500">
                                <span>ID: {p.id}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingPersona(p)} className="text-blue-400 hover:text-blue-300">Edit</button>
                                    {p.isCustom && (
                                        <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300">Delete</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {editingPersona && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
                            <form onSubmit={handleSave} className="p-6">
                                <h2 className="text-2xl font-bold mb-6">{editingPersona.id ? 'Edit Persona' : 'Create New Persona'}</h2>
                                
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-1">Unique ID</label>
                                            <input 
                                                required
                                                disabled={!!editingPersona.id && !editingPersona.isCustom}
                                                value={editingPersona.id || ''} 
                                                onChange={e => setEditingPersona({...editingPersona, id: e.target.value})}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                                placeholder="specialist-name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-1">Display Name</label>
                                            <input 
                                                required
                                                value={editingPersona.name || ''} 
                                                onChange={e => setEditingPersona({...editingPersona, name: e.target.value})}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                                                placeholder="Scientific Researcher"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">System Prompt</label>
                                        <textarea 
                                            required
                                            rows={6}
                                            value={editingPersona.prompt || ''} 
                                            onChange={e => setEditingPersona({...editingPersona, prompt: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                                            placeholder="You are an expert in..."
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            id="isEnabled"
                                            checked={editingPersona.isEnabled}
                                            onChange={e => setEditingPersona({...editingPersona, isEnabled: e.target.checked})}
                                        />
                                        <label htmlFor="isEnabled" className="text-sm font-medium text-slate-300">Enable this persona in the engine</label>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors">
                                        Save Persona
                                    </button>
                                    <button type="button" onClick={() => setEditingPersona(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <ConfirmModal 
                    isOpen={!!deletePersonaId}
                    onClose={() => setDeletePersonaId(null)}
                    onConfirm={confirmDelete}
                    title="Delete Persona"
                    message="Are you sure you want to permanently delete this research persona? This will remove it from the TARE intelligence engine."
                    isDestructive={true}
                    confirmLabel="Delete"
                />
            </div>
        </div>
    );
}

export default function PersonaPage() {
    return (
        <RoleGuard requiredRoles={['su', 'admin']}>
            <PersonaManagerContent />
        </RoleGuard>
    );
}
