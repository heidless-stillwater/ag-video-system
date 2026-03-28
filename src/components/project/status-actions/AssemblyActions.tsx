import React from 'react';
import { Project, Script } from '@/types';

interface AssemblyActionsProps {
    project: Project;
    script: Script | null;
    isAssembling: boolean;
    onAssemble: () => void;
}

export const AssemblyActions: React.FC<AssemblyActionsProps> = ({
    project,
    script,
    isAssembling,
    onAssemble
}) => {
    if (!['generating_media', 'assembling', 'review'].includes(project.status) || !script) return null;

    return (
        <div className="w-full">
            <button
                onClick={onAssemble}
                disabled={isAssembling}
                className="w-full h-16 px-6 bg-gradient-to-r from-blue-600 to-cyan-500 hover:bg-blue-500 hover:to-cyan-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-6"
            >
                <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner ${isAssembling ? 'bg-blue-600/10' : 'bg-blue-600/20 group-hover:bg-blue-600/30'}`}>
                    {isAssembling ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <span className="text-xl">🎬</span>
                    )}
                </div>
                <span>{isAssembling ? 'Baking Documentary...' : 'Assemble & Fine Tune'}</span>
            </button>
        </div>
    );
};
