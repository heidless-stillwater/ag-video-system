import React, { useState, useEffect } from 'react';
import { Project, Script } from '@/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { PersonaSelector } from './PersonaSelector';
import { Microscope, Clock, Zap, CheckCircle2, Sparkles, Edit3 } from 'lucide-react';

interface ScriptingActionsProps {
    project: Project;
    script: Script | null;
    isScripting: boolean;
    isResearching: boolean;
    persona: string;
    onPersonaChange: (persona: string) => void;
    onGenerateScript: () => void;
    onLaunchResearch: () => void;
    onCancelResearch?: () => void;
    onSkipToAssembly: () => void;
    interceptAction: (action: () => void, title: string, message: string) => void;
    onUpdateProject?: (updates: Partial<Project>) => Promise<void>;
    onSetViewMode: (view: 'overview' | 'timeline' | 'settings') => void;
}

export const ScriptingActions: React.FC<ScriptingActionsProps> = ({
    project,
    script,
    isScripting,
    isResearching,
    persona,
    onPersonaChange,
    onGenerateScript,
    onLaunchResearch,
    onCancelResearch,
    onSkipToAssembly,
    interceptAction,
    onUpdateProject,
    onSetViewMode
}) => {
    const [personaName, setPersonaName] = useState('Standard');
    const [localDuration, setLocalDuration] = useState(project.targetDuration || project.estimatedDuration || 1);
    const [localPacing, setLocalPacing] = useState(project.targetPacing || 130);
    const [personaMap, setPersonaMap] = useState<Record<string, string>>({});
    const { authFetch, firebaseUser, user: authUser } = useAuth();
    const [scriptProgress, setScriptProgress] = useState(0);

    // Progress Simulation for Scripting
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isScripting) {
            setScriptProgress(0);
            interval = setInterval(() => {
                setScriptProgress(prev => {
                    if (prev >= 92) return prev; // Hold at 92 until done
                    const step = prev < 50 ? 5 : prev < 80 ? 2 : 0.5;
                    return Math.min(prev + step, 95);
                });
            }, 600);
        } else {
            setScriptProgress(0);
        }
        return () => clearInterval(interval);
    }, [isScripting]);

    // Fetch personas to map IDs to names for historical display
    useEffect(() => {
        // Don't fetch until auth is resolved
        if (!authUser && !firebaseUser) return;

        let cancelled = false;
        const fetchNames = async (attempt = 0) => {
            try {
                const res = await authFetch('/api/research/personas');
                if (cancelled) return;
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.personas) {
                        const map: Record<string, string> = {};
                        data.personas.forEach((p: any) => map[p.id] = p.name);
                        setPersonaMap(map);
                    }
                }
            } catch (err) {
                if (cancelled) return;
                // Retry once on transient network errors (e.g. dev server restart)
                if (attempt === 0) {
                    setTimeout(() => fetchNames(1), 2000);
                } else {
                    console.warn('Failed to map persona names:', err);
                }
            }
        };
        fetchNames();
        return () => { cancelled = true; };
    }, [authFetch, authUser, firebaseUser]);

    // Sync local state when project updates externally
    useEffect(() => {
        setLocalDuration(project.targetDuration || project.estimatedDuration || 1);
    }, [project.targetDuration]);

    useEffect(() => {
        setLocalPacing(project.targetPacing || 130);
    }, [project.targetPacing]);
    const hasFacts = (project.research?.facts?.length || 0) > 0;
    // Show scripting actions if we are researching, scripting, or in draft phase
    const isReadyForActions = project.status === 'researching' || project.status === 'scripting' || project.status === 'draft';
    
    if (!isReadyForActions) return null;

    return (
        <div className="space-y-4 w-full">
            {/* Project-Specific Production Controls */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl space-y-3 group/ctrl hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Duration</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">{localDuration}m</span>
                    </div>
                    <input 
                        type="range"
                        min="1"
                        max="60"
                        step="1"
                        value={localDuration}
                        disabled={isScripting || isResearching}
                        onChange={(e) => setLocalDuration(parseInt(e.target.value))}
                        onMouseUp={() => onUpdateProject?.({ targetDuration: localDuration })}
                        className="w-full accent-emerald-500 disabled:opacity-30"
                    />
                    <p className="text-[8px] text-slate-600 font-medium leading-tight">Total Production Length.</p>
                </div>

                <div className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl space-y-3 group/ctrl hover:border-blue-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-blue-400" />
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Pacing</span>
                        </div>
                        <span className="text-[10px] font-mono text-blue-400 font-bold">{localPacing}</span>
                    </div>
                    <input 
                        type="range"
                        min="100"
                        max="180"
                        step="5"
                        value={localPacing}
                        disabled={isScripting || isResearching}
                        onChange={(e) => setLocalPacing(parseInt(e.target.value))}
                        onMouseUp={() => onUpdateProject?.({ targetPacing: localPacing })}
                        className="w-full accent-blue-500 disabled:opacity-30"
                    />
                    <p className="text-[8px] text-slate-600 font-medium leading-tight">WPM (Sleep Default: 130)</p>
                </div>
            </div>

            <PersonaSelector 
                value={persona} 
                onChange={onPersonaChange}
                onPersonaNameChange={setPersonaName}
                disabled={isScripting || isResearching}
            />

            <div className="relative group">
                {/* Glow Effect - emerald if mission ran, blue if not */}
                <div className={`absolute -inset-1 bg-gradient-to-r ${hasFacts ? 'from-emerald-600 to-teal-600' : 'from-blue-600 to-indigo-600'} rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200`}></div>
                
                <button
                    onClick={() => interceptAction(
                        onLaunchResearch,
                        `Deploy ${personaName.toUpperCase()} Agent?`,
                        `This will authorize the ${personaName} persona to conduct deep network research for: "${project.title}". This operation consumes 0.5 credits.`
                    )}
                    disabled={isResearching}
                    className={`relative w-full h-16 border rounded-2xl transition-all flex items-center gap-6 px-6 overflow-hidden ${isResearching ? 'bg-slate-900 border-blue-500/20 opacity-50' : hasFacts ? 'bg-slate-950 border-emerald-800/50 hover:border-emerald-500/50 text-white' : 'bg-slate-950 border-slate-800 hover:border-blue-500/50 text-white'}`}
                >
                    {/* Background shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>

                    <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner ${isResearching ? 'bg-blue-600/10' : hasFacts ? 'bg-emerald-600/20 group-hover:bg-emerald-600/30' : 'bg-blue-600/20 group-hover:bg-blue-600/30'}`}>
                        <Microscope className={`w-5 h-5 ${isResearching ? 'text-blue-400/50' : hasFacts ? 'text-emerald-400' : 'text-blue-400'}`} />
                    </div>
                    
                    <div className="relative flex flex-col items-start text-left">
                        <span className="text-sm font-black uppercase tracking-[0.2em]">Topic Research</span>
                        {hasFacts ? (
                            <span className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3" />
                                {personaMap[project.research.persona || ''] || 'Standard'} Mission Complete — {project.research.facts.length} facts indexed
                            </span>
                        ) : (
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest group-hover:text-blue-400/80 transition-colors">Mission Profile: {personaName}</span>
                        )}
                    </div>

                    {hasFacts ? (
                        <div className="ml-auto flex-shrink-0">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Done</span>
                            </div>
                        </div>
                    ) : (
                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-6 h-6 rounded-full border border-blue-500/30 flex items-center justify-center">
                                <span className="text-[10px] text-blue-400">→</span>
                            </div>
                        </div>
                    )}
                </button>
            </div>

            {isResearching && (
                <div className="animate-in slide-in-from-top-4 duration-500 space-y-3">
                    <button
                        onClick={onLaunchResearch}
                        className="flex items-center gap-3 p-4 bg-slate-900/50 hover:bg-slate-900 border border-blue-500/20 hover:border-blue-500/50 rounded-2xl transition-all group w-full text-left shadow-lg shadow-blue-500/5"
                    >
                        <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">VIEW LIVE INTELLIGENCE FEED</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">SCANNING GLOBAL INTEL NODES...</p>
                        </div>
                    </button>
                    {onCancelResearch && (
                        <button
                            onClick={onCancelResearch}
                            className="w-full h-12 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-500/70 hover:text-red-500 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
                        >
                            ABORT OPERATION
                        </button>
                    )}
                </div>
            )}

            {hasFacts && (
                <div className="space-y-2">
                    {isScripting && (
                        <div className="space-y-1 px-1">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-blue-400 animate-pulse">Synthesizing {localDuration}m Script...</span>
                                <span className="text-slate-500">{Math.round(scriptProgress)}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                                    style={{ width: `${scriptProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            onGenerateScript();
                        }}
                        disabled={isScripting}
                        className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isScripting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                <span className="text-sm font-black uppercase tracking-[0.2em]">Synthesizing {localDuration}m Narrative...</span>
                            </>
                        ) : (
                            <>
                                <Edit3 className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-black uppercase tracking-[0.2em]">{script ? 'Regenerate' : 'Generate'} {localDuration}m Script</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};
