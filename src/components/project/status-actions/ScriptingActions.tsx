import React from 'react';
import { Project, Script } from '@/types';

interface ScriptingActionsProps {
    project: Project;
    script: Script | null;
    isScripting: boolean;
    onGenerateScript: () => void;
    interceptAction: (action: () => void, title: string, message: string) => void;
}

export const ScriptingActions: React.FC<ScriptingActionsProps> = ({
    project,
    script,
    isScripting,
    onGenerateScript,
    interceptAction
}) => {
    if (project.status !== 'researching' && (project.status !== 'scripting' || !!script)) return null;

    return (
        <button
            onClick={() => interceptAction(
                onGenerateScript,
                'Generate Sleep Script?',
                'This will use Gemini to write a sleep-optimized documentary script. In STAGING mode, this is a real API call.'
            )}
            disabled={isScripting}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-2xl font-bold shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center gap-3"
        >
            {isScripting ? (
                <>
                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    <span>Generating Sleep Script...</span>
                </>
            ) : (
                <span>✍️ Generate Documentary Script</span>
            )}
        </button>
    );
};
