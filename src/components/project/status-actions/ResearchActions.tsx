import React from 'react';
import { Project } from '@/types';

interface ResearchActionsProps {
    project: Project;
    isResearching: boolean;
    onLaunchResearch: () => void;
    interceptAction: (action: () => void, title: string, message: string) => void;
}

export const ResearchActions: React.FC<ResearchActionsProps> = ({
    project,
    isResearching,
    onLaunchResearch,
    interceptAction
}) => {
    if (project.status !== 'draft') return null;

    return (
        <button
            onClick={() => interceptAction(
                onLaunchResearch,
                'Launch AI Research?',
                'This will use Vertex AI to extract facts about the topic. In STAGING mode, this is a real API call.'
            )}
            disabled={isResearching}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-3"
        >
            {isResearching ? (
                <>
                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    <span>Orchestrating AI Research...</span>
                </>
            ) : (
                <span>🚀 Launch Research Phase</span>
            )}
        </button>
    );
};
