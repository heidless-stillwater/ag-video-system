import React from 'react';
import { ResearchSource, Fact } from '@/types';

interface ResearchExplorerProps {
    sources: ResearchSource[];
    facts: Fact[];
}

export const ResearchExplorer: React.FC<ResearchExplorerProps> = ({ sources, facts }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Information Sources</h3>
                {sources.length > 0 ? (
                    <div className="space-y-3">
                        {sources.map(source => (
                            <a key={source.id} href={source.url} target="_blank" className="block p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors border border-slate-700/30 group">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-200 truncate">{source.title}</span>
                                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">Wiki</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 truncate">{source.url}</p>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-slate-600 text-sm">No sources added yet.</p>
                    </div>
                )}
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Extracted Facts</h3>
                {facts.length > 0 ? (
                    <div className="space-y-3">
                        {facts.map((fact, i) => (
                            <div key={i} className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/30 leading-snug">
                                <p className="text-sm text-slate-300 italic">"{fact.statement}"</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-slate-600 text-sm">No facts extracted yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
