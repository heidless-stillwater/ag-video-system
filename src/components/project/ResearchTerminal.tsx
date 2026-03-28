import React, { useState, useEffect, useRef } from 'react';

interface ResearchTerminalProps {
    topic: string;
    logs: string[];
    stats: {
        sources: number;
        facts: number;
        quotes: number;
    };
    onClose: () => void;
    isComplete: boolean;
}

export const ResearchTerminal: React.FC<ResearchTerminalProps> = ({
    topic,
    logs,
    stats,
    onClose,
    isComplete
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <h3 className="ml-4 font-mono text-sm text-slate-400">
                            TARE // RESEARCH_AGENT v1.0 // topic: "{topic}"
                        </h3>
                    </div>
                    {isComplete && (
                        <button 
                            onClick={onClose}
                            className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg text-sm font-bold transition-all"
                        >
                            FINISH & VIEW RESULTS
                        </button>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Log Terminal */}
                    <div 
                        ref={scrollRef}
                        className="flex-1 p-6 font-mono text-xs overflow-y-auto bg-slate-950/50"
                    >
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1 flex gap-3 text-slate-300">
                                <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                                <span className={log.startsWith('Error') ? 'text-red-400' : 'text-blue-400'}>
                                    {log.startsWith('Fact') ? '✨' : log.startsWith('Source') ? '🔍' : '>'}
                                </span>
                                <span>{log}</span>
                            </div>
                        ))}
                        {!isComplete && (
                            <div className="flex gap-2 items-center text-blue-400 animate-pulse mt-4">
                                <span>_</span>
                                <span className="text-xs uppercase tracking-widest font-bold">Investigating...</span>
                            </div>
                        )}
                    </div>

                    {/* Stats Sidebar */}
                    <div className="w-64 border-l border-slate-800 p-6 bg-slate-900/30 flex flex-col gap-6">
                        <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                            <div className="text-xs text-slate-500 uppercase tracking-tighter mb-1">Sources Discovered</div>
                            <div className="text-3xl font-bold text-blue-400">{stats.sources}</div>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                            <div className="text-xs text-slate-500 uppercase tracking-tighter mb-1">Facts Extracted</div>
                            <div className="text-3xl font-bold text-emerald-400">{stats.facts}</div>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                            <div className="text-xs text-slate-500 uppercase tracking-tighter mb-1">Notable Quotes</div>
                            <div className="text-3xl font-bold text-amber-400">{stats.quotes}</div>
                        </div>
                        
                        <div className="mt-auto pt-6 border-t border-slate-800">
                            <div className="flex justify-between items-center text-[10px] text-slate-500 mb-2">
                                <span>CPU USAGE</span>
                                <span>{isComplete ? '0%' : '14%'}</span>
                            </div>
                            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full bg-blue-500 transition-all duration-1000 ${isComplete ? 'w-0' : 'w-1/3 animate-pulse'}`}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Progress */}
                <div className="h-1 bg-slate-800">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                        style={{ width: isComplete ? '100%' : `${Math.min(logs.length * 5, 95)}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};
