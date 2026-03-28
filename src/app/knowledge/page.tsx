'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { ResearchArtifact } from '@/lib/services/knowledge-service';
import Link from 'next/link';

export default function KnowledgeVault() {
    const { user, authFetch } = useAuth();
    const [artifacts, setArtifacts] = useState<ResearchArtifact[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (user) {
            fetchArtifacts();
        }
    }, [user]);

    const fetchArtifacts = async () => {
        try {
            // Simplified fetch for demo
            const res = await authFetch(`/api/knowledge?userId=${user?.id}`);
            const data = await res.json();
            if (data.success) {
                setArtifacts(data.artifacts);
            } else {
                // If API not ready yet, use mock data if needed or just empty
                setArtifacts([]);
            }
        } catch (error) {
            console.error('Error fetching artifacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredArtifacts = artifacts.filter(a => 
        a.topic.toLowerCase().includes(search.toLowerCase()) || 
        a.category.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 pt-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Link href="/" className="text-xs font-black text-slate-500 hover:text-white transition-colors tracking-widest uppercase italic">🛸 Dashboard</Link>
                            <span className="text-slate-800">/</span>
                            <span className="text-xs font-black text-cyan-500 tracking-widest uppercase italic">KNOWLEDGE_VAULT_DECRYPTOR</span>
                        </div>
                        <h1 className="text-6xl font-black italic tracking-tighter leading-none mb-4">
                            ARCHIVAL_INTELLIGENCE
                        </h1>
                        <p className="text-slate-500 max-w-xl text-lg font-medium leading-relaxed">
                            A secure repository of all decrypted intelligence reports and synthesized research findings.
                        </p>
                    </div>
                    <div className="w-full md:w-96 relative">
                         <input 
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="SEARCH_BY_TOPIC_OR_FILE_TAG"
                            className="w-full bg-slate-900/40 border-b-2 border-slate-800 px-4 py-4 focus:outline-none focus:border-cyan-500 font-mono text-sm transition-all"
                         />
                         <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-50">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-slate-900/50 rounded-3xl animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredArtifacts.length === 0 ? (
                        <div className="h-[400px] border-2 border-dashed border-slate-900 rounded-[40px] flex flex-col items-center justify-center group hover:border-blue-900/50 transition-all">
                            <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <span className="text-4xl opacity-20">📂</span>
                            </div>
                            <h3 className="text-xl font-black text-slate-700 tracking-tighter uppercase mb-2">Vault is Currently Vacuum_Empty</h3>
                            <p className="text-slate-600 font-medium italic text-sm">Launch a Research Mission to populate this sector.</p>
                            <Link href="/research" className="mt-8 px-8 py-3 bg-slate-900 hover:bg-slate-800 rounded-full text-xs font-black tracking-widest transition-all">START_RESEARCH →</Link>
                        </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredArtifacts.map(artifact => (
                            <div key={artifact.id} className="group bg-slate-900/30 border border-slate-800/80 rounded-[32px] p-8 hover:border-cyan-500/50 transition-all relative overflow-hidden flex flex-col h-full active:scale-95 cursor-pointer">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs font-mono font-black text-cyan-400">#DOC_{artifact.id?.substring(0,6)}</span>
                                </div>
                                <div className="mb-6">
                                    <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase rounded-lg tracking-widest mb-4 inline-block">{artifact.category}</span>
                                    <h3 className="text-2xl font-black tracking-tight leading-7 group-hover:text-cyan-400 transition-colors uppercase italic">{artifact.topic}</h3>
                                </div>
                                <p className="text-slate-500 text-sm italic font-medium line-clamp-3 mb-8 flex-1">
                                    "{artifact.summary}"
                                </p>
                                <div className="pt-6 border-t border-slate-800/50 flex justify-between items-center text-[10px] font-black tracking-widest">
                                    <div className="flex flex-col">
                                        <span className="text-slate-600 mb-1 leading-none">INTELLIGENCE_SOURCE</span>
                                        <span className="text-slate-400">{artifact.personaName}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-slate-600 mb-1 leading-none">TIMESTAMP</span>
                                        <span className="text-slate-400">{new Date(artifact.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Vault Terminal Status */}
                <div className="mt-20 p-8 bg-slate-900/20 border border-slate-800/40 rounded-[40px] backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row gap-12 justify-around">
                        <div className="flex flex-col items-center">
                            <span className="text-4xl font-black text-white italic tracking-tighter mb-1">{artifacts.length}</span>
                            <span className="text-[10px] font-black text-slate-600 tracking-widest uppercase">INTEL_REPORTS_STORED</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-4xl font-black text-cyan-500 italic tracking-tighter mb-1">98.2%</span>
                            <span className="text-[10px] font-black text-slate-600 tracking-widest uppercase">SYNTHESIS_ACCURACY_AVG</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-4xl font-black text-white italic tracking-tighter mb-1">PRO</span>
                            <span className="text-[10px] font-black text-slate-600 tracking-widest uppercase">VAULT_ACCESS_LEVEL</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
