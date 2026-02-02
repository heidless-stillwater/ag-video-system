import { Project, Script } from '@/types';
import { AMBIANCE_LAYERS } from '@/lib/services/audio';

interface SoundDesignerProps {
    project: Project;
    script: Script | null;
    isSoundDesigning: boolean;
    onAmbianceSelect: (layerId: string) => void;
    onGenerateSoundDesign: () => void;
    interceptAction: (action: () => void, title: string, message: string) => void;
}

export const SoundDesigner: React.FC<SoundDesignerProps> = ({
    project,
    script,
    isSoundDesigning,
    onAmbianceSelect,
    onGenerateSoundDesign,
    interceptAction
}) => {
    if (!script || !['scripting', 'generating_media', 'assembling', 'ready'].includes(project.status)) {
        return null;
    }

    return (
        <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-6 mb-8 max-w-2xl relative overflow-hidden group/sfx">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-[40px] -mr-16 -mt-16 group-hover/sfx:bg-teal-500/10 transition-all duration-700"></div>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🎻</span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Sound Designer</h3>
                </div>
                {project.ambianceUrl && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                        <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">{project.ambianceLabel || 'Custom Ambiance'}</span>
                    </div>
                )}
            </div>
            <p className="text-[10px] text-slate-500 mb-6 leading-relaxed">
                Orchestrate contextual sound effects (SFX) and atmospheric layers based on your visual cues.
            </p>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    {AMBIANCE_LAYERS.map((amb: any) => (
                        <button
                            key={amb.id}
                            onClick={() => onAmbianceSelect(amb.id)}
                            className={`p-3 rounded-xl border transition-all text-left flex flex-col gap-1 ${project.ambianceUrl === amb.url
                                ? 'bg-teal-600/20 border-teal-500 shadow-lg shadow-teal-500/10'
                                : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold leading-tight ${project.ambianceUrl === amb.url ? 'text-teal-400' : 'text-white'}`}>{amb.label}</span>
                                {project.ambianceUrl === amb.url && <span className="w-2 h-2 rounded-full bg-teal-500"></span>}
                            </div>
                            <span className="text-[10px] text-slate-500 leading-tight capitalize">{amb.category} Ambiance</span>
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => interceptAction(
                        onGenerateSoundDesign,
                        'Run AI Sound Design?',
                        'Gemini will analyze your visual scenes and assign the most appropriate sound effects from our curated library.'
                    )}
                    disabled={isSoundDesigning}
                    className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${project.ambianceUrl
                        ? 'bg-slate-700 hover:bg-slate-600 text-teal-400 border border-teal-500/20'
                        : 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/10'}`}
                >
                    {isSoundDesigning ? (
                        <>
                            <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                            <span>Scoring Documentary...</span>
                        </>
                    ) : (
                        <span>{project.ambianceUrl ? '🤖 Re-orchestrate SFX with Gemini' : '🎻 Orchestrate AI Sound Design'}</span>
                    )}
                </button>
            </div>
        </div>
    );
};
