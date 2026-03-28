'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { PersonaDoc } from '@/lib/services/persona-service';
import { ResearchSession } from '@/lib/services/research-service';
import Link from 'next/link';

export default function ResearchDashboard() {
    const { user, authFetch } = useAuth();
    const [personas, setPersonas] = useState<PersonaDoc[]>([]);
    const [sessions, setSessions] = useState<ResearchSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
    const [topic, setTopic] = useState('');
    const [isLaunching, setIsLaunching] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (user) {
            fetchPersonas();
            fetchSessions();
        }
    }, [user]);

    const fetchPersonas = async () => {
        try {
            const res = await authFetch('/api/research/personas');
            const data = await res.json();
            if (data.success) {
                setPersonas(data.personas.filter((p: PersonaDoc) => p.isEnabled));
            }
        } catch (error) {
            console.error('Error fetching personas:', error);
        }
    };

    const fetchSessions = async () => {
        try {
            const res = await authFetch(`/api/research/sessions?userId=${user?.id}`);
            const data = await res.json();
            if (data.success) {
                setSessions(data.sessions);
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLaunch = async () => {
        if (!selectedPersona || !topic.trim() || !user) return;
        
        setIsLaunching(true);
        setMessage('');

        try {
            const res = await authFetch('/api/research/sessions', {
                method: 'POST',
                body: JSON.stringify({
                    userId: user.id,
                    topic,
                    personaId: selectedPersona
                })
            });
            const data = await res.json();
            if (data.success) {
                setMessage('Mission launched! Initializing agents...');
                setTopic('');
                setSelectedPersona(null);
                fetchSessions();
            }
        } catch (error: any) {
            setMessage(`Launch failed: ${error.message}`);
        } finally {
            setIsLaunching(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8 pt-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <Link href="/" className="text-blue-500 hover:text-blue-400 text-sm font-bold">🛸 STATION_DEFI</Link>
                             <span className="text-slate-700">/</span>
                             <span className="text-slate-500 text-sm font-mono">TARE_ENGINE_V2.0</span>
                        </div>
                        <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-500 bg-clip-text text-transparent tracking-tighter">
                            RESEARCH COMMAND CENTER
                        </h1>
                        <p className="text-slate-400 text-lg">Deploy specialized intelligence agents to investigate any topic</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Persona Selector (Left Column) */}
                    <div className="lg:col-span-2 space-y-8">
                        <section>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 text-lg">01</span>
                                SELECT DEPLOYMENT PERSONA
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {loading ? (
                                    <div className="col-span-2 py-12 text-center text-slate-500 italic">
                                        Waking up the research team...
                                    </div>
                                ) : personas.map(persona => (
                                    <button 
                                        key={persona.id}
                                        onClick={() => setSelectedPersona(persona.id)}
                                        className={`text-left bg-slate-800/50 border transition-all group relative overflow-hidden p-6 rounded-2xl ${
                                            selectedPersona === persona.id ? 'border-blue-500 ring-1 ring-blue-500 shadow-lg shadow-blue-900/40' : 'border-slate-700/50 hover:border-slate-600'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className={`text-xl font-black ${selectedPersona === persona.id ? 'text-blue-400' : 'text-slate-200'}`}>{persona.name}</h3>
                                            <span className="text-2xl grayscale group-hover:grayscale-0 transition-all opacity-40 group-hover:opacity-100">🤖</span>
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed font-medium capitalize">
                                            {persona.prompt}
                                        </p>
                                        <div className="flex gap-2">
                                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest">Ready_to_Sync</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-lg">02</span>
                                DEFINE MISSION PARAMETERS
                            </h2>
                            <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-sm">
                                <div className="mb-6">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">RESEARCH_TOPIC_INPUT</label>
                                    <textarea 
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        className="w-full bg-slate-900/50 border-2 border-slate-700 rounded-2xl p-6 text-white placeholder-slate-700 focus:outline-none focus:border-cyan-500 min-h-[120px] transition-all"
                                        placeholder="What should the agent investigate? (e.g. 'The Neurobiology of Deep Sleep Cycles', 'Sleep habits of Ancient Rome')"
                                    />
                                </div>
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                    <p className="text-xs text-slate-500 italic max-w-xs">
                                        Note: Detailed prompts yield 40% higher intelligence accuracy during the Synthesis Phase.
                                    </p>
                                    <button 
                                        onClick={handleLaunch}
                                        disabled={isLaunching || !selectedPersona || !topic.trim()}
                                        className="w-full md:w-auto px-12 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale active:scale-95"
                                    >
                                        {isLaunching ? (
                                            <span className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></span>
                                        ) : (
                                            <>🚀 LAUNCH_MISSION</>
                                        )}
                                    </button>
                                </div>
                                {message && <p className="mt-4 text-center font-bold text-sm text-cyan-400">{message}</p>}
                            </div>
                        </section>
                    </div>

                    {/* Active Sessions (Right Column) */}
                    <div className="space-y-8">
                        <section>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="text-cyan-400 animate-pulse">📡</span> LIVE_TELEMETRY
                            </h2>
                            <div className="space-y-4">
                                {sessions.length === 0 ? (
                                    <div className="p-8 bg-slate-800/30 border border-slate-700/30 rounded-3xl flex flex-col items-center justify-center text-center py-16 opacity-50">
                                        <div className="text-5xl mb-6 grayscale text-blue-500">📡</div>
                                        <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">No active missions detected.</p>
                                    </div>
                                ) : (
                                    sessions.map(session => (
                                        <div key={session.id} className="p-5 bg-slate-800/50 border border-slate-700/50 rounded-2xl group hover:border-blue-500/40 transition-all">
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="text-sm font-black uppercase tracking-tight line-clamp-1">{session.topic}</h4>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                                    session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500 animate-pulse'
                                                }`}>
                                                    {session.status}
                                                </span>
                                            </div>
                                            <div className="w-full h-1 bg-slate-900 rounded-full mb-3 overflow-hidden">
                                                <div 
                                                    className="h-full bg-blue-500 transition-all duration-1000"
                                                    style={{ width: `${session.progress}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                                <span>PROGRESS: {session.progress}%</span>
                                                <Link href={`/research/${session.id}`} className="text-blue-500 hover:text-white transition-colors">VIEW_DATA →</Link>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <section className="bg-gradient-to-br from-indigo-900/30 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-3xl p-8 relative overflow-hidden group">
                             <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors"></div>
                            <h3 className="font-black text-indigo-400 mb-4 text-xs tracking-widest uppercase">TARE_ENGINE_OVERVIEW</h3>
                            <p className="text-xs text-slate-400 italic leading-relaxed border-l-2 border-indigo-500/30 pl-4 font-medium">
                                "The Topic Analysis & Research Engine (TARE) utilizes proprietary tiered persona clusters to identify mystery patterns in educational data points, maximizing audience retention."
                            </p>
                            <div className="mt-6 pt-6 border-t border-slate-800">
                                <div className="flex justify-between text-[10px] font-black text-slate-600">
                                    <span>SYSTEM_STATUS</span>
                                    <span className="text-emerald-500 uppercase">Operational</span>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
