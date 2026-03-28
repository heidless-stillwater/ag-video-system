import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, ShieldCheck, AlertCircle, Info } from 'lucide-react';

export interface Log {
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
    timestamp: string;
}

interface ResearchTerminalProps {
    logs: Log[];
}

export const ResearchTerminal: React.FC<ResearchTerminalProps> = ({ logs }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const getIcon = (type: Log['type']) => {
        switch (type) {
            case 'success': return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
            case 'warning': return <AlertCircle className="w-4 h-4 text-amber-400" />;
            default: return <Info className="w-4 h-4 text-blue-400" />;
        }
    };

    return (
        <div className="w-full bg-black/90 rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col h-[400px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                    <TerminalIcon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-mono font-bold tracking-widest uppercase text-white/50">Research Pulse</span>
                </div>
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                </div>
            </div>
            
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[13px] scroll-smooth"
            >
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                        <TerminalIcon className="w-12 h-12 mb-2 animate-pulse" />
                        <span>Awaiting system initialization...</span>
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="flex gap-3 group animate-in slide-in-from-left duration-300">
                            <span className="text-white/20 select-none min-w-[60px] text-right">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <div className="flex gap-2">
                                <span className="pt-0.5">{getIcon(log.type)}</span>
                                <span className={`
                                    ${log.type === 'success' ? 'text-emerald-400' : 
                                      log.type === 'error' ? 'text-red-400' : 
                                      log.type === 'warning' ? 'text-amber-400' : 
                                      'text-blue-100 group-hover:text-white'}
                                    transition-colors
                                `}>
                                    {log.message}
                                </span>
                            </div>
                        </div>
                    ))
                )}
                <div className="h-4" />
            </div>

            <div className="px-4 py-2 bg-indigo-500/[0.03] border-t border-white/5 flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Agent Active</span>
                </div>
                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500/50 animate-[shimmer_2s_infinite]" style={{ width: '40%' }} />
                </div>
            </div>
        </div>
    );
};
