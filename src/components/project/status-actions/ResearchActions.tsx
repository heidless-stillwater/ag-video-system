'use client';

import React from 'react';
import { Microscope } from 'lucide-react';
import { Project } from '@/types';
import { PersonaSelector } from './PersonaSelector';

interface ResearchActionsProps {
    project: Project;
    isResearching: boolean;
    persona: string;
    onPersonaChange: (persona: string) => void;
    onLaunchResearch: () => void;
    onCancelResearch?: () => void;
    interceptAction: (action: () => void, title: string, message: string) => void;
}

export function ResearchActions({ 
    project, 
    isResearching, 
    persona,
    onPersonaChange,
    onLaunchResearch,
    onCancelResearch,
    interceptAction
}: ResearchActionsProps) {
    const [personaName, setPersonaName] = React.useState('Standard');

    const hasFacts = (project.research?.facts?.length || 0) > 0;

    if (!isResearching) return null;

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3">
                <button
                    onClick={onLaunchResearch}
                    className="flex items-center gap-3 p-4 bg-slate-900/50 hover:bg-slate-900 border border-blue-500/20 hover:border-blue-500/50 rounded-2xl transition-all group w-full text-left"
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
        </div>
    );
}
