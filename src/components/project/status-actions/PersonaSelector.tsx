'use client';

import React, { useEffect, useState } from 'react';
import { Microscope, User } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

interface Persona {
    id: string;
    name: string;
    role: string;
    description: string;
    engines?: string[];
}

interface PersonaSelectorProps {
    value: string;
    onChange: (value: string) => void;
    onPersonaNameChange?: (name: string) => void;
    disabled?: boolean;
}

export function PersonaSelector({ value, onChange, onPersonaNameChange, disabled }: PersonaSelectorProps) {
    const [availablePersonas, setAvailablePersonas] = useState<Persona[]>([]);
    const [loading, setLoading] = useState(true);

    const { authFetch } = useAuth();

    useEffect(() => {
        const fetchPersonas = async () => {
            try {
                const res = await authFetch('/api/research/personas');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.personas) {
                        setAvailablePersonas(data.personas);
                        // Notify parent of initial name
                        const initial = data.personas.find((p: any) => p.id === value);
                        if (initial && onPersonaNameChange) onPersonaNameChange(initial.name);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch personas:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPersonas();
    }, [authFetch, onPersonaNameChange, value]);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value;
        onChange(newValue);
        const selected = availablePersonas.find(p => p.id === newValue);
        if (selected && onPersonaNameChange) {
            onPersonaNameChange(selected.name);
        }
    };

    if (loading) return (
        <div className="h-10 w-full bg-slate-800/50 rounded-xl animate-pulse"></div>
    );

    const currentPersona = availablePersonas.find(p => p.id === value);

    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                Research & Scripting Persona
            </label>
            <div className="relative group">
                <select
                    value={value}
                    onChange={handleSelectChange}
                    disabled={disabled}
                    className="w-full h-10 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/50 rounded-xl px-4 py-2 text-xs text-white appearance-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {availablePersonas.map(persona => (
                        <option key={persona.id} value={persona.id} className="bg-slate-900 border-none">
                            {persona.name}{persona.role ? ` (${persona.role})` : ''}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <Microscope className="w-3.5 h-3.5" />
                </div>
            </div>
            {currentPersona && (
                <div className="px-1 space-y-1.5">
                    <p className="text-[10px] text-slate-500 italic leading-relaxed">
                        {currentPersona.description}
                    </p>
                    {currentPersona.engines && currentPersona.engines.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {currentPersona.engines.map(engine => (
                                <span key={engine} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[7px] font-black uppercase tracking-widest text-blue-400 border border-blue-500/20">
                                    {engine.replace('-', ' ')}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

