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
    if ((project.status !== 'generating_media' && project.status !== 'assembling') || !script) return null;

    return (
        <button
            onClick={onAssemble}
            disabled={isAssembling}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-3"
        >
            {isAssembling ? (
                <>
                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    <span>Baking Documentary...</span>
                </>
            ) : (
                <span>🎬 {project.status === 'assembling' ? 'Preview Documentary' : 'Assemble & Preview'}</span>
            )}
        </button>
    );
};
