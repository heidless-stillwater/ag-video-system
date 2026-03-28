import React, { useState } from 'react';
import { X, Clock, Zap, BookOpen, Users, Wind, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScriptConfiguration {
    persona: string;
    targetDuration: number;
    targetPacing: number;
    sleepInducingLevel: 'standard' | 'deep' | 'delta';
    vocabularyComplexity: 'simple' | 'high' | 'academic';
    targetAudience: 'general' | 'children' | 'insomniacs';
    atmosphere: string;
}

interface ScriptConfigurationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (config: ScriptConfiguration) => void;
    initialPersona: string;
    initialDuration: number;
    initialPacing: number;
    isGenerating: boolean;
}

export const ScriptConfigurationModal: React.FC<ScriptConfigurationModalProps> = ({
    isOpen,
    onClose,
    onStart,
    initialPersona,
    initialDuration,
    initialPacing,
    isGenerating
}) => {
    const [config, setConfig] = useState<ScriptConfiguration>({
        persona: initialPersona || 'standard',
        targetDuration: initialDuration || 1,
        targetPacing: initialPacing || 130,
        sleepInducingLevel: 'standard',
        vocabularyComplexity: 'high',
        targetAudience: 'general',
        atmosphere: 'Calm and steady'
    });

    // Reset config when modal opens to pick up latest project state
    React.useEffect(() => {
        if (isOpen) {
            setConfig({
                persona: initialPersona || 'standard',
                targetDuration: initialDuration || 1,
                targetPacing: initialPacing || 130,
                sleepInducingLevel: 'standard',
                vocabularyComplexity: 'high',
                targetAudience: 'general',
                atmosphere: 'Calm and steady'
            });
        }
    }, [isOpen, initialPersona, initialDuration, initialPacing]);

    if (!isOpen) return null;

    const personas = [
        { id: 'standard', name: 'The Neutralist', icon: '⚖️' },
        { id: 'historian', name: 'The Historian', icon: '📜' },
        { id: 'scientist', name: 'The Scientist', icon: '🧪' },
        { id: 'poet', name: 'The Poet', icon: '✍️' },
        { id: 'skeptic', name: 'The Skeptic', icon: '🔍' },
    ];

    const handleStart = () => {
        onStart(config);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
                    onClick={onClose}
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-[#0d1117] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">Script Synthesis Engine</h2>
                            <p className="text-white/40 text-xs uppercase tracking-widest font-black">Configure Narrative Parameters</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <X className="w-6 h-6 text-white/30" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                        
                        {/* Narrative Persona */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-400">
                                <Users className="w-4 h-4" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Narrative Persona</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {personas.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setConfig({ ...config, persona: p.id })}
                                        className={`
                                            p-4 rounded-2xl border transition-all text-left flex flex-col gap-2
                                            ${config.persona === p.id 
                                                ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                                                : 'bg-white/[0.02] border-white/5 hover:border-white/20'}
                                        `}
                                    >
                                        <span className="text-xl">{p.icon}</span>
                                        <span className={`text-xs font-bold ${config.persona === p.id ? 'text-indigo-300' : 'text-white/60'}`}>{p.name}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Duration & Pacing */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-indigo-400">
                                    <Clock className="w-4 h-4" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Timing & Pacing</h3>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-white/40">
                                            <span>Target Duration</span>
                                            <span className="text-indigo-400">{config.targetDuration} minutes</span>
                                        </div>
                                        <input 
                                            type="range" min="1" max="60" step="1"
                                            value={config.targetDuration}
                                            onChange={(e) => setConfig({ ...config, targetDuration: parseInt(e.target.value) })}
                                            className="w-full accent-indigo-500 h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-white/40">
                                            <span>Words Per Minute</span>
                                            <span className="text-indigo-400">{config.targetPacing} WPM</span>
                                        </div>
                                        <input 
                                            type="range" min="100" max="160" step="5"
                                            value={config.targetPacing}
                                            onChange={(e) => setConfig({ ...config, targetPacing: parseInt(e.target.value) })}
                                            className="w-full accent-indigo-500 h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Complexity & Audience */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-indigo-400">
                                    <BookOpen className="w-4 h-4" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Intellectual Depth</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['simple', 'high', 'academic'] as const).map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => setConfig({ ...config, vocabularyComplexity: level })}
                                                className={`
                                                    py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all
                                                    ${config.vocabularyComplexity === level 
                                                        ? 'bg-white/10 border-white/20 text-white' 
                                                        : 'bg-white/[0.02] border-white/5 text-white/30 hover:text-white/60'}
                                                `}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                    <select 
                                        value={config.targetAudience}
                                        onChange={(e) => setConfig({ ...config, targetAudience: e.target.value as any })}
                                        className="w-full bg-[#161b22] border border-white/10 rounded-xl px-4 py-3 text-xs text-white/80 focus:outline-none focus:border-indigo-500/50"
                                    >
                                        <option value="general" className="bg-[#0d1117] text-white">General Audience</option>
                                        <option value="children" className="bg-[#0d1117] text-white">Bedtime Story (Children)</option>
                                        <option value="insomniacs" className="bg-[#0d1117] text-white">Deep Insomnia Focus</option>
                                    </select>
                                </div>
                            </section>
                        </div>

                        {/* Sleep Level & Atmosphere */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-400">
                                <Wind className="w-4 h-4" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Sonic & Atmospheric Atmosphere</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Acoustic Preference</label>
                                    <div className="flex gap-2">
                                        {(['standard', 'deep', 'delta'] as const).map((lvl) => (
                                            <button
                                                key={lvl}
                                                onClick={() => setConfig({ ...config, sleepInducingLevel: lvl })}
                                                className={`
                                                    flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all
                                                    ${config.sleepInducingLevel === lvl 
                                                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' 
                                                        : 'bg-white/[0.02] border-white/5 text-white/20'}
                                                `}
                                            >
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Ambient Context</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. Rainy mountain cabin..."
                                        value={config.atmosphere}
                                        onChange={(e) => setConfig({ ...config, atmosphere: e.target.value })}
                                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/10 focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Synthesis Workflow Description */}
                        <section className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                            <div className="flex items-center gap-2 text-white/40">
                                <Zap className="w-4 h-4" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Synthesis Workflow</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { step: "01", label: "Fact Ingestion", desc: "Parsing research nodes" },
                                    { step: "02", label: "Persona Alignment", desc: "Injecting narrative lens" },
                                    { step: "03", label: "Atmospheric Layering", desc: "Weaving sensory cues" },
                                    { step: "04", label: "Delta-Wave Pacing", desc: "Final rhythmic tuning" }
                                ].map((s) => (
                                    <div key={s.step} className="space-y-1">
                                        <div className="text-[9px] font-black text-indigo-500/50">{s.step}</div>
                                        <div className="text-[10px] font-bold text-white/80 leading-tight">{s.label}</div>
                                        <div className="text-[9px] text-white/20 leading-tight">{s.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="p-8 bg-white/[0.02] border-t border-white/5">
                        <button 
                            onClick={handleStart}
                            disabled={isGenerating}
                            className={`
                                w-full py-5 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-4 transition-all
                                shadow-[0_20px_40px_rgba(79,70,229,0.2)] disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span>Synthesizing Script...</span>
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5" />
                                    <span className="uppercase tracking-[0.2em] text-sm">Initiate Transcription Mission</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
