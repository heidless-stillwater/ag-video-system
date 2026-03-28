import React from 'react';
import { Brain, Book, History, Microscope, Sparkles } from 'lucide-react';

export type PersonaType = 'standard' | 'historian' | 'scientist' | 'culture_scout' | 'skeptic';

interface Persona {
    id: PersonaType;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    engines: string[];
}

const PERSONAS: Persona[] = [
    {
        id: 'standard',
        name: 'The Neutralist',
        description: 'Balanced and objective research focus.',
        icon: <Brain className="w-5 h-5" />,
        color: 'from-blue-500/20 to-indigo-500/20',
        engines: ['gemini-2.5-flash']
    },
    {
        id: 'historian',
        name: 'The Historian',
        description: 'Deep dive into origins, timelines, and evolution.',
        icon: <History className="w-5 h-5" />,
        color: 'from-emerald-500/20 to-teal-500/20',
        engines: ['perplexity-sonar']
    },
    {
        id: 'scientist',
        name: 'The Scientist',
        description: 'Focuses on mechanisms, data, and academic findings.',
        icon: <Microscope className="w-5 h-5" />,
        color: 'from-cyan-500/20 to-blue-500/20',
        engines: ['gemini-2.5-flash']
    },
    {
        id: 'culture_scout',
        name: 'The Culture Scout',
        description: 'Finds trivia, human stories, and cultural impact.',
        icon: <Sparkles className="w-5 h-5" />,
        color: 'from-purple-500/20 to-pink-500/20',
        engines: ['tavily-search']
    },
    {
        id: 'skeptic',
        name: 'The Skeptic',
        description: 'Debunks myths and focuses on verified precision.',
        icon: <Book className="w-5 h-5" />,
        color: 'from-amber-500/20 to-orange-500/20',
        engines: ['perplexity-sonar']
    }
];

interface PersonaSelectorProps {
    selectedPersona: PersonaType;
    onSelect: (persona: PersonaType) => void;
    onSelectWithName?: (id: PersonaType, name: string) => void;
    disabled?: boolean;
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
    selectedPersona,
    onSelect,
    onSelectWithName,
    disabled
}) => {
    // Sync initial name up
    React.useEffect(() => {
        const p = PERSONAS.find(p => p.id === selectedPersona);
        if (p && onSelectWithName) onSelectWithName(p.id, p.name);
    }, []);

    const handleSelect = (p: Persona) => {
        onSelect(p.id);
        if (onSelectWithName) onSelectWithName(p.id, p.name);
    };
    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 w-full">
            {PERSONAS.map((p) => {
                const isSelected = selectedPersona === p.id;
                return (
                    <button
                        key={p.id}
                        onClick={() => handleSelect(p)}
                        disabled={disabled}
                        className={`
                            relative flex flex-col items-center p-4 rounded-xl border transition-all duration-300
                            ${isSelected 
                                ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]' 
                                : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'}
                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                    >
                        <div className={`p-3 rounded-full bg-gradient-to-br ${p.color} mb-3 shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]`}>
                            {p.icon}
                        </div>
                        <span className="text-sm font-semibold mb-1">{p.name}</span>
                        <p className="text-[10px] text-white/50 text-center leading-tight mb-3">
                            {p.description}
                        </p>
                        
                        <div className="mt-auto pt-2 border-t border-white/5 w-full">
                            <div className="flex flex-wrap justify-center gap-1">
                                {p.engines.map(engine => (
                                    <span key={engine} className="px-1.5 py-0.5 rounded bg-white/5 text-[8px] font-black uppercase tracking-tighter text-indigo-400">
                                        {engine.split('-')[0]}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {isSelected && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgb(99,102,241)]" />
                        )}
                    </button>
                );
            })}
        </div>
    );
};
