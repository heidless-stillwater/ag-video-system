import React from 'react';
import { Project } from '@/types';

interface AudioMixerProps {
    project: Project;
    onVolumeChange: (type: 'narrationVolume' | 'backgroundMusicVolume' | 'ambianceVolume' | 'globalSfxVolume' | 'autoDucking', value: number | boolean) => void;
}

export const AudioMixer: React.FC<AudioMixerProps> = ({ project, onVolumeChange }) => {
    const channels = [
        { id: 'narrationVolume', label: '🎙️ Narration', value: project.narrationVolume ?? 1.0 },
        { id: 'backgroundMusicVolume', label: '🎵 Music', value: project.backgroundMusicVolume ?? 0.2 },
        { id: 'ambianceVolume', label: '🌧️ Ambiance', value: project.ambianceVolume ?? 0.1 },
        { id: 'globalSfxVolume', label: '🔥 Scene SFX', value: project.globalSfxVolume ?? 0.4 }
    ];

    return (
        <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-6 mb-8 max-w-2xl relative overflow-hidden group/mixer">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] -mr-16 -mt-16 group-hover/mixer:bg-blue-500/10 transition-all duration-700"></div>
            <div className="flex items-center gap-2 mb-6">
                <span className="text-xl">🎚️</span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Master Audio Mixer</h3>
            </div>

            <div className="space-y-6">
                {channels.map(channel => (
                    <div key={channel.id} className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-slate-400">{channel.label}</span>
                            <span className="text-blue-400">{Math.round((channel.value as number) * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={channel.value as number}
                            onChange={(e) => onVolumeChange(channel.id as any, parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                        />
                    </div>
                ))}

                {/* Auto-Ducking Toggle */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Intelligent Ducking</span>
                        <span className="text-[9px] text-slate-500 uppercase tracking-tighter">Auto-dip music during narration</span>
                    </div>
                    <button
                        onClick={() => onVolumeChange('autoDucking', !(project.audioSettings?.autoDucking ?? true))}
                        className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${project.audioSettings?.autoDucking ?? true ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${project.audioSettings?.autoDucking ?? true ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
            </div>
        </div>
    );
};
