import { Project } from '@/types';
import { AMBIENT_TRACKS } from '@/lib/services/audio';

interface AmbientMusicSelectorProps {
    project: Project;
    onMusicSelect: (trackId: string) => void;
}

export const AmbientMusicSelector: React.FC<AmbientMusicSelectorProps> = ({ project, onMusicSelect }) => {
    return (
        <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-6 mb-8 max-w-2xl">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🎵</span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Background Soundscape</h3>
                </div>
                <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">NEW</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {AMBIENT_TRACKS.map((track: any) => (
                    <button
                        key={track.id}
                        onClick={() => onMusicSelect(track.id)}
                        className={`p-3 rounded-xl border transition-all text-left flex flex-col gap-1 ${project.backgroundMusicUrl === track.url
                            ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/10'
                            : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white leading-tight">{track.title}</span>
                            {project.backgroundMusicUrl === track.url && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                        </div>
                        <span className="text-[10px] text-slate-500 leading-tight">{track.bpm} BPM • {track.description.split('.')[0]}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
