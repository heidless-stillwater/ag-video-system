import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search, Microscope, Sparkles, AlertTriangle, ShieldCheck, Globe, Database, Image, Map, Clock, CheckCircle2, CircleDashed, Info, Terminal as TerminalIcon } from 'lucide-react';
import { PersonaSelector, PersonaType } from './PersonaSelector';
import { ResearchTerminal, Log } from './ResearchTerminal';

interface ResearcherStep {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    timestamp: string;
}

interface ResearcherState {
    id: string;
    name: string;
    type: 'historical' | 'technical' | 'visual' | 'location' | 'cultural' | 'standard';
    status: 'idle' | 'running' | 'completed' | 'error';
    steps: ResearcherStep[];
    currentStep?: string;
}

interface ResearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onLaunch: (onComplete?: () => void) => Promise<void>;
    isResearching: boolean;
    logs: Log[];
    selectedPersona: PersonaType | string;
    onPersonaChange: (persona: PersonaType | string) => void;
    topic: string;
    onCancel?: () => void;
}

const AGENT_CONFIG: Record<string, { icon: any, color: string, description: string }> = {
    historian: { icon: Clock, color: 'indigo', description: 'Chronology & Origins' },
    scientist: { icon: Database, color: 'blue', description: 'Impact & Complexity' },
    culture_scout: { icon: Globe, color: 'amber', description: 'Global Context' },
    skeptic: { icon: ShieldCheck, color: 'red', description: 'Critical Analysis' },
    standard: { icon: Microscope, color: 'slate', description: 'General Analysis' }
};

export const ResearchOverlay: React.FC<ResearchOverlayProps> = ({
    isOpen,
    onClose,
    onLaunch,
    isResearching,
    logs,
    selectedPersona,
    onPersonaChange,
    topic,
    onCancel
}) => {
    // Local state to track persona name for the UI
    const [personaName, setPersonaName] = useState(() => {
        const names: Record<string, string> = {
            standard: 'Neutralist',
            historian: 'Historian',
            scientist: 'Scientist',
            culture_scout: 'Culture Scout',
            skeptic: 'Skeptic'
        };
        return names[selectedPersona] || 'Standard';
    });
    const wasResearchingRef = useRef(false);

    // Auto-close modal when research completes
    useEffect(() => {
        if (wasResearchingRef.current && !isResearching && isOpen) {
            // Research just finished - wait 1.5s for user to see completion, then close
            const timer = setTimeout(() => {
                onClose();
            }, 1500);
            return () => clearTimeout(timer);
        }
        wasResearchingRef.current = isResearching;
    }, [isResearching, isOpen, onClose]);

    // Local state to track parallel researchers
    const [researchers, setResearchers] = useState<Record<string, ResearcherState>>({});

    // Process logs to update researcher states
    useEffect(() => {
        if (!isResearching) {
            if (Object.keys(researchers).length > 0) setResearchers({});
            return;
        }

        const newResearchers = { ...researchers };
        let hasChanges = false;

        // Only process newly added logs
        // Note: In a real app we might want a more efficient way or just slice the last few
        logs.forEach(log => {
            try {
                // If the log is actually an event (check if it has 'event' property)
                // The useContentCreation hook passes the parsed JSON from the server
                const event = (log as any).event;
                if (!event) return;

                const { researcherId, researcherName, type, stepId, stepLabel } = (log as any);

                if (event === 'researcher_start') {
                    if (!newResearchers[researcherId]) {
                        newResearchers[researcherId] = {
                            id: researcherId,
                            name: researcherName || researcherId,
                            type: (type as any) || 'standard',
                            status: 'running',
                            steps: []
                        };
                        hasChanges = true;
                    }
                } else if (event === 'researcher_step') {
                    if (newResearchers[researcherId]) {
                        const existingStepIdx = newResearchers[researcherId].steps.findIndex(s => s.id === stepId);
                        if (existingStepIdx === -1) {
                            newResearchers[researcherId].steps.push({
                                id: stepId,
                                label: stepLabel,
                                status: 'running',
                                timestamp: new Date().toISOString()
                            });
                        } else {
                            newResearchers[researcherId].steps[existingStepIdx].status = 'running';
                        }
                        newResearchers[researcherId].currentStep = stepLabel;
                        hasChanges = true;
                    }
                } else if (event === 'researcher_step_complete') {
                    if (newResearchers[researcherId]) {
                        const step = newResearchers[researcherId].steps.find(s => s.id === stepId);
                        if (step) {
                            step.status = 'completed';
                            hasChanges = true;
                        }
                    }
                } else if (event === 'researcher_complete') {
                    if (newResearchers[researcherId]) {
                        newResearchers[researcherId].status = 'completed';
                        newResearchers[researcherId].currentStep = 'Analysis complete';
                        hasChanges = true;
                    }
                }
            } catch (e) {
                // Not an event log, ignore
            }
        });

        if (hasChanges) {
            setResearchers(newResearchers);
        }
    }, [logs, isResearching]);

    const activeResearchers = useMemo(() => {
        const list = Object.values(researchers);
        // Ensure standard/selected persona is prominent
        return list.sort((a, b) => {
            if (a.id === selectedPersona) return -1;
            if (b.id === selectedPersona) return 1;
            return 0;
        });
    }, [researchers, selectedPersona]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
            <div 
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-700"
                onClick={onClose}
            />
            
            <div className={`
                relative w-full max-w-6xl bg-[#0a0c10] border border-white/10 rounded-[2.5rem] shadow-[0_0_120px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[95vh]
                transition-all duration-700 transform
                ${isOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-20 scale-95 opacity-0'}
            `}>
                {/* Header - Glassmorphism */}
                <div className="p-8 border-b border-white/[0.05] flex items-center justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5" />
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center border border-white/10 shadow-inner">
                            <Microscope className="w-7 h-7 text-indigo-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-bold tracking-tight text-white">
                                    Stillwater Global Intelligence
                                </h2>
                                {isResearching && (
                                    <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                                        <span className="text-emerald-400 text-[9px] font-black uppercase tracking-widest">Global Node Sync</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-white/30 flex items-center gap-2">
                                <span className="text-blue-500">Multimodal</span> Retrieval Subsystem v8.0 | Deep-Archives Active
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 relative z-10">
                        {isResearching && onCancel && (
                            <button 
                                onClick={onCancel}
                                className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center gap-2"
                            >
                                <X className="w-3.5 h-3.5" />
                                Stop Research
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className="p-3 hover:bg-white/5 rounded-full transition-all group border border-transparent hover:border-white/10"
                            title={isResearching ? "Hide research (continues in background)" : "Close"}
                        >
                            <X className="w-7 h-7 text-white/30 group-hover:text-white group-hover:rotate-90 transition-all duration-500" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar relative">
                    {/* Background Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

                    {/* Topic Summary */}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.05] relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                            <Sparkles className="w-24 h-24 text-indigo-400" />
                        </div>
                        <div className="relative z-10">
                            <label className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-[0.25em] mb-4 block">Current Inquiry</label>
                            <h3 className="text-3xl md:text-4xl font-light text-white leading-tight max-w-3xl">
                                {topic}
                            </h3>
                        </div>
                    </div>

                    {!isResearching ? (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            {/* Persona Selection */}
                            <div className="space-y-6">
                                <div className="flex items-end justify-between px-2">
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white/60">Analytical Lens</h4>
                                        <p className="text-xs text-white/30">Choose a computational perspective for this analysis</p>
                                    </div>
                                    <div className="h-[1px] flex-1 mx-6 bg-gradient-to-r from-white/10 to-transparent mb-2" />
                                </div>
                                <PersonaSelector 
                                    selectedPersona={selectedPersona as any}
                                    onSelect={(p) => onPersonaChange(p)}
                                    // Hacky but works for keeping name synced
                                    onSelectWithName={(id, name) => {
                                        onPersonaChange(id);
                                        setPersonaName(name);
                                    }}
                                />
                            </div>

                            {/* Precautions */}
                            <div className="p-6 rounded-2xl bg-amber-500/[0.03] border border-amber-500/10 flex gap-6 items-start shadow-xl">
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-black text-amber-500/80 uppercase tracking-widest">Resource Intensive Operation</p>
                                    <p className="text-sm text-amber-200/40 leading-relaxed font-light">
                                        This process initiates deep crawling across global databases. It ensures factual integrity and visual accuracy for your content. Estimated time: <span className="text-amber-500/60 font-medium">90-180 seconds</span>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-12 animate-in fade-in duration-1000">
                            {/* Parallel Agents View */}
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {activeResearchers.length === 0 ? (
                                    // Placeholder loading state
                                    Array(selectedPersona === 'standard' ? 3 : 5).fill(0).map((_, i) => (
                                        <div key={i} className="h-64 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] animate-pulse flex flex-col p-8 space-y-6">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl bg-white/5" />
                                                <div className="space-y-3">
                                                    <div className="h-5 w-32 bg-white/5 rounded-lg" />
                                                    <div className="h-4 w-24 bg-white/5 rounded-lg" />
                                                </div>
                                            </div>
                                            <div className="h-[2px] w-full bg-white/5 rounded-full" />
                                            <div className="space-y-3">
                                                <div className="h-3.5 w-full bg-white/5 rounded-lg" />
                                                <div className="h-3.5 w-[80%] bg-white/5 rounded-lg" />
                                                <div className="h-3.5 w-[60%] bg-white/5 rounded-lg" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    activeResearchers.map((agent, index) => (
                                        <ResearcherCard 
                                            key={agent.id} 
                                            agent={agent} 
                                            isLead={agent.id === selectedPersona}
                                            index={index}
                                        />
                                    ))
                                )}
                            </div>

                            {/* Live Terminal */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        <TerminalIcon className="w-4 h-4 text-indigo-400" />
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Raw Intelligence Stream</h4>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-indigo-500/50 animate-pulse" />
                                </div>
                                <ResearchTerminal logs={logs} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Actions */}
                {!isResearching && (
                    <div className="p-8 bg-white/[0.01] border-t border-white/5 flex gap-6">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-5 px-8 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all text-sm uppercase tracking-widest shadow-lg"
                        >
                            Abort
                        </button>
                        <button 
                            onClick={() => onLaunch()}
                            className="flex-[2.5] py-5 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-[0_20px_40px_rgba(79,70,229,0.2)] hover:shadow-[0_25px_50px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-4 text-sm group uppercase tracking-[0.2em] overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                <Globe className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            Launch {personaName} Synthesis
                            <div className="ml-auto flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
                                <span className="text-[11px] font-black">150</span>
                                <div className="p-1 rounded-full bg-indigo-400/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                </div>
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Sub-component for individual agent cards
const ResearcherCard: React.FC<{ agent: ResearcherState, isLead?: boolean, index: number }> = ({ agent, isLead, index }) => {
    const config = AGENT_CONFIG[agent.type] || AGENT_CONFIG.standard;
    const Icon = config.icon;
    
    // Sort steps by timestamp
    const sortedSteps = [...agent.steps].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return (
        <div className={`
            p-8 rounded-[2.5rem] border transition-all duration-700 group relative overflow-hidden backdrop-blur-md
            ${agent.status === 'running' 
                ? 'bg-indigo-500/[0.04] border-indigo-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_20px_rgba(79,70,229,0.1)]' 
                : agent.status === 'completed'
                    ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                    : 'bg-white/[0.02] border-white/5'}
            animate-in zoom-in-95 duration-700 delay-[${index * 100}ms]
        `}>
            {/* Background Scanning Animation */}
            {agent.status === 'running' && (
                <div className="absolute inset-x-0 h-[100px] bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent -translate-y-full animate-[scan_3s_linear_infinite]" />
            )}

            {/* Status Indicator */}
            <div className="absolute top-0 right-0 p-8">
                {agent.status === 'running' ? (
                    <div className="relative">
                        <CircleDashed className="w-6 h-6 text-indigo-400 animate-spin" />
                        <div className="absolute inset-0 bg-indigo-400 blur-sm rounded-full opacity-20 animate-pulse" />
                    </div>
                ) : agent.status === 'completed' ? (
                    <div className="bg-emerald-500/20 rounded-xl p-1.5 border border-emerald-500/30">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                ) : null}
            </div>

            <div className="flex items-center gap-6 mb-8 relative z-10">
                <div className={`
                    w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-700 relative
                    ${agent.status === 'running' 
                        ? 'bg-indigo-500/20 border-indigo-500/40 shadow-[0_0_30px_rgba(79,70,229,0.3)]' 
                        : 'bg-white/5 border-white/10'}
                `}>
                    <Icon className={`w-7 h-7 ${agent.status === 'running' ? 'text-indigo-400' : 'text-white/30'}`} />
                    {agent.status === 'running' && (
                        <div className="absolute -inset-1 border border-indigo-500/20 rounded-[1.25rem] animate-ping opacity-20" />
                    )}
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-[13px] font-black text-white uppercase tracking-[0.15em] group-hover:text-indigo-300 transition-colors">
                            {agent.name}
                        </h5>
                        {isLead && (
                            <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/40 text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                                Lead
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                        {config.description}
                    </p>
                </div>
            </div>

            {/* Progress Bar with Glow */}
            <div className="mb-8 relative">
                <div className="h-[3px] w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-1000 ease-out rounded-full relative ${agent.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'}`}
                        style={{ 
                            width: agent.status === 'completed' 
                                ? '100%' 
                                : agent.steps.length > 0 
                                    ? `${Math.min(agent.steps.length * 20, 95)}%` 
                                    : '8%' 
                        }}
                    >
                        {agent.status === 'running' && (
                            <div className="absolute top-0 right-0 w-8 h-full bg-white/40 blur-[4px] animate-[shimmer_1s_infinite]" />
                        )}
                    </div>
                </div>
            </div>

            {/* Steps List */}
            <div className="space-y-4 min-h-[100px] relative z-10">
                {sortedSteps.slice(0, 3).map((step, i) => (
                    <div 
                        key={step.id} 
                        className="flex items-center gap-4 animate-in slide-in-from-left-4 duration-500"
                        style={{ animationDelay: `${i * 100}ms` }}
                    >
                        <div className="relative">
                            {step.status === 'completed' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : step.status === 'running' ? (
                                <>
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                                    <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                </>
                            ) : (
                                <div className="w-1.5 h-1.5 rounded-full border border-white/20" />
                            )}
                        </div>
                        <span className={`text-[12px] font-medium leading-tight truncate ${step.status === 'running' ? 'text-indigo-200' : 'text-white/40'}`}>
                            {step.label}
                        </span>
                    </div>
                ))}
                
                {agent.steps.length > 3 && (
                    <div className="pt-2 flex items-center gap-2 pl-7">
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                        <p className="text-[9px] font-black text-indigo-400/40 uppercase tracking-widest pl-2">
                            Extrapolating {agent.steps.length - 3} further insights
                        </p>
                    </div>
                )}

                {agent.steps.length === 0 && (
                    <div className="flex items-center justify-center h-20 opacity-10">
                        <div className="text-center space-y-2">
                            <Database className="w-8 h-8 mx-auto animate-pulse" />
                            <p className="text-[10px] uppercase tracking-widest font-black">Connecting...</p>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Corner Accent */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/5 group-hover:bg-indigo-500/10 rounded-full blur-3xl transition-colors duration-700" />
        </div>
    );
};
