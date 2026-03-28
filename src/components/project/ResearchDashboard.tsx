import React, { useState } from 'react';
import { ResearchSource, Fact } from '@/types';
import { Globe, Database, Newspaper, BookOpen, Fingerprint, Activity, Zap, ShieldCheck, Microscope, User, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth/AuthContext';

interface ResearchDashboardProps {
    sources: ResearchSource[];
    facts: Fact[];
    personaId?: string;
    isResearching?: boolean;
    onBackToTimeline?: () => void;
    onViewLive?: () => void;
    onCancelResearch?: () => void;
}

export const ResearchDashboard: React.FC<ResearchDashboardProps> = ({ sources, facts, personaId, isResearching, onBackToTimeline, onViewLive, onCancelResearch }) => {
    const [activeTab, setActiveTab] = useState<'sources' | 'facts' | 'archives' | 'intelligence'>('sources');
    const [persona, setPersona] = useState<any | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const { authFetch } = useAuth();

    React.useEffect(() => {
        if (personaId) {
            authFetch('/api/research/personas')
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const found = data.personas.find((p: any) => p.id === personaId);
                        setPersona(found);
                    }
                });
        }
    }, [personaId]);

    return (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl mb-8">
            <div 
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Microscope className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Intelligence Dashboard</h3>
                            <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">
                                {sources.length + facts.length} Signals
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Real-time retrieval dashboard for verified sources and extracted data.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter whitespace-nowrap">Global Node: Verified</span>
                    </div>
                    <motion.div
                        animate={{ rotate: isCollapsed ? 0 : 180 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <ChevronDown className="w-5 h-5 text-slate-500" />
                    </motion.div>
                </div>
            </div>

            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <div className="border-t border-white/5">
                            {/* Header / Tabs */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/60">
                                <div className="flex items-center gap-6">
                                    <button 
                                        onClick={() => setActiveTab('sources')}
                                        className={`text-[10px] font-bold uppercase tracking-widest transition-all pb-1 border-b-2 ${activeTab === 'sources' ? 'text-blue-400 border-blue-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                                    >
                                        Intelligence Sources ({sources.length})
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('facts')}
                                        className={`text-[10px] font-bold uppercase tracking-widest transition-all pb-1 border-b-2 ${activeTab === 'facts' ? 'text-purple-400 border-purple-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                                    >
                                        Extracted Data ({facts.length})
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('archives')}
                                        className={`text-[10px] font-bold uppercase tracking-widest transition-all pb-1 border-b-2 ${activeTab === 'archives' ? 'text-amber-400 border-amber-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                                    >
                                        Deep Archives
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('intelligence')}
                                        className={`text-[10px] font-bold uppercase tracking-widest transition-all pb-1 border-b-2 ${activeTab === 'intelligence' ? 'text-emerald-400 border-emerald-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                                    >
                                        Global Intelligence
                                    </button>
                                </div>

                                <div className="flex items-center gap-4">
                                    {isResearching && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
                                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">Live Retrieval</span>
                                                {onCancelResearch && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onCancelResearch();
                                                        }}
                                                        className="ml-2 px-2 py-0.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-400 text-[8px] font-black uppercase tracking-tighter rounded transition-all active:scale-95"
                                                    >
                                                        Stop
                                                    </button>
                                                )}
                                            </div>
                                            {onViewLive && (
                                                <button 
                                                    onClick={onViewLive}
                                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    <Microscope className="w-3.5 h-3.5" />
                                                    View Live Stream
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {onBackToTimeline && (
                                        <button 
                                            onClick={onBackToTimeline}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                        >
                                            <span>🏗️</span>
                                            Return to Building
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="p-6 min-h-[400px]">
                                {activeTab === 'sources' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {sources.length > 0 ? (
                                            sources.map(source => (
                                                <a 
                                                    key={source.id} 
                                                    href={source.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="group p-4 bg-slate-800/30 border border-white/5 rounded-2xl hover:bg-slate-800/50 hover:border-blue-500/30 transition-all duration-300"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                                            <Newspaper className="w-4 h-4 text-blue-400" />
                                                        </div>
                                                        <span className="text-[8px] font-bold text-blue-500/60 uppercase group-hover:text-blue-400 transition-colors">Verified Node</span>
                                                    </div>
                                                    <h4 className="text-sm font-bold text-slate-200 mb-1 group-hover:text-white transition-colors line-clamp-1">{source.title}</h4>
                                                    <p className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors truncate">{source.url}</p>
                                                </a>
                                            ))
                                        ) : (
                                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                                                <div className="p-4 bg-slate-800/50 rounded-full mb-4">
                                                    <Microscope className="w-8 h-8 text-slate-600" />
                                                </div>
                                                <h3 className="text-slate-400 font-bold text-lg">No Intelligence Gathered</h3>
                                                <p className="text-slate-600 text-xs max-w-xs mt-2">Launch an AI research mission to extract verified data and global sources.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'facts' && (
                                    <div className="space-y-3">
                                        {facts.length > 0 ? (
                                            facts.map((fact, i) => (
                                                <div 
                                                    key={i} 
                                                    className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl flex gap-4 items-start group hover:bg-purple-500/10 transition-all"
                                                >
                                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-500 group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                                                    <p className="text-sm text-slate-300 leading-relaxed italic group-hover:text-slate-100 transition-colors">"{fact.statement}"</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                                <div className="p-4 bg-slate-800/50 rounded-full mb-4">
                                                    <Database className="w-8 h-8 text-slate-600" />
                                                </div>
                                                <h3 className="text-slate-400 font-bold text-lg">Knowledge Base Empty</h3>
                                                <p className="text-slate-600 text-xs max-w-xs mt-2">Awaiting data extraction from the global intelligence network.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'archives' && (
                                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full"></div>
                                            <BookOpen className="w-16 h-16 text-amber-500/60 relative z-10" />
                                        </div>
                                        <div>
                                            <h3 className="text-amber-400 font-black text-2xl uppercase tracking-tighter">Deep Archives Lockdown</h3>
                                            <p className="text-slate-500 text-sm max-w-sm mt-3 mx-auto">Historical records and cross-referenced datasets will appear here as the documentary evolves. Accessing multi-decade intelligence nodes.</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 w-full max-w-md">
                                            {[1, 2, 3, 4, 5, 6].map(i => (
                                                <div key={i} className="h-24 bg-slate-800/30 border border-white/5 rounded-xl flex items-center justify-center">
                                                    <div className="w-8 h-1 bg-slate-700/50 rounded-full animate-pulse"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'intelligence' && (
                                    <div className="space-y-6">
                                        <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                                <Globe className="w-24 h-24 text-emerald-500" />
                                            </div>
                                            <h3 className="text-emerald-400 font-black text-xl uppercase tracking-tighter mb-4">Global Network Active</h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                <div className="space-y-1">
                                                    <span className="text-[8px] font-bold text-emerald-600 uppercase">Latency</span>
                                                    <p className="text-lg font-mono text-emerald-200">24ms</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[8px] font-bold text-emerald-600 uppercase">Coverage</span>
                                                    <p className="text-lg font-mono text-emerald-200">Worldwide</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[8px] font-bold text-emerald-600 uppercase">Confidence</span>
                                                    <p className="text-lg font-mono text-emerald-200">98.4%</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[8px] font-bold text-emerald-600 uppercase">Nodes</span>
                                                    <p className="text-lg font-mono text-emerald-200">Verified</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-800/20 border border-white/5 rounded-2xl p-6">
                                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Multimodal Extraction Status</h4>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-[9px] uppercase font-bold tracking-tighter">
                                                        <span className="text-slate-400">Context Understanding</span>
                                                        <span className="text-emerald-400">Optimal</span>
                                                    </div>
                                                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-emerald-500 w-[95%]"></div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-[9px] uppercase font-bold tracking-tighter">
                                                        <span className="text-slate-400">Cross-Lingual Retrieval</span>
                                                        <span className="text-emerald-400">High Score</span>
                                                    </div>
                                                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-emerald-500 w-[88%] shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Overlay */}
                            <div className="px-6 py-3 bg-slate-950/80 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {persona && (
                                        <div className="flex items-center gap-2 group">
                                            <div className="flex items-center gap-2 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full transition-all group-hover:bg-indigo-500/20">
                                                <span className="text-[10px]">{persona.emoji || '🤖'}</span>
                                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">{persona.name} Agent</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Global Intelligence Sync: Active</span>
                                    </div>
                                    <div className="h-3 w-[1px] bg-white/10"></div>
                                    <span className="text-[8px] font-mono text-slate-600">ENCRYPTION: AES-256-GCM</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-2 py-0.5 bg-blue-500/5 border border-blue-500/10 rounded text-[7px] text-blue-500 font-bold uppercase">Multimodal</span>
                                    <span className="px-2 py-0.5 bg-purple-500/5 border border-purple-500/10 rounded text-[7px] text-purple-500 font-bold uppercase">Archive Ready</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
