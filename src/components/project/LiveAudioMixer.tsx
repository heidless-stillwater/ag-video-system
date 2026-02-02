import React from 'react';

interface LiveAudioMixerProps {
    narrationVolume: number;
    setNarrationVolume: (val: number) => void;
    musicVolume: number;
    setMusicVolume: (val: number) => void;
    ambianceVolume: number;
    setAmbianceVolume: (val: number) => void;
    sfxVolume: number;
    setSfxVolume: (val: number) => void;
    autoDucking: boolean;
    setAutoDucking: (val: boolean) => void;

    // Initial values for Reset
    initialNarrationVolume: number;
    initialMusicVolume: number;
    initialAmbianceVolume: number;
    initialSfxVolume: number;
    initialAutoDucking: boolean;

    onLiveVolumeChange?: (key: 'narrationVolume' | 'backgroundMusicVolume' | 'ambianceVolume' | 'globalSfxVolume' | 'autoDucking', value: number | boolean) => void;
    onSave?: (settings: {
        narrationVolume: number;
        backgroundMusicVolume: number;
        ambianceVolume: number;
        globalSfxVolume: number;
        autoDucking: boolean;
    }) => Promise<void>;
    isSaving: boolean;
}

export const LiveAudioMixer: React.FC<LiveAudioMixerProps> = ({
    narrationVolume, setNarrationVolume,
    musicVolume, setMusicVolume,
    ambianceVolume, setAmbianceVolume,
    sfxVolume, setSfxVolume,
    autoDucking, setAutoDucking,

    initialNarrationVolume,
    initialMusicVolume,
    initialAmbianceVolume,
    initialSfxVolume,
    initialAutoDucking,

    onLiveVolumeChange,
    onSave,
    isSaving
}) => {
    return (
        <div className="mt-6 p-6 bg-gradient-to-br from-purple-900/20 to-slate-900/40 border border-purple-500/20 rounded-2xl space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-purple-300 uppercase tracking-widest flex items-center gap-2">
                    <span>🎚️</span> Master Audio Mixer
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setNarrationVolume(initialNarrationVolume);
                            setMusicVolume(initialMusicVolume);
                            setAmbianceVolume(initialAmbianceVolume);
                            setSfxVolume(initialSfxVolume);
                            setAutoDucking(initialAutoDucking);
                        }}
                        className="px-3 py-1.5 text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                        Reset
                    </button>
                    {onSave && (
                        <button
                            onClick={async () => {
                                await onSave({
                                    narrationVolume,
                                    backgroundMusicVolume: musicVolume,
                                    ambianceVolume,
                                    globalSfxVolume: sfxVolume,
                                    autoDucking
                                });
                            }}
                            disabled={isSaving}
                            className="px-4 py-1.5 text-xs font-bold bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5"
                        >
                            {isSaving ? (
                                <>
                                    <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    Saving...
                                </>
                            ) : (
                                <>💾 Save Settings</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Narration Volume */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">🎙️ Narration</label>
                        <span className="text-xs font-mono text-purple-400">{Math.round(narrationVolume * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={narrationVolume}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setNarrationVolume(val);
                            onLiveVolumeChange?.('narrationVolume', val);
                        }}
                        className="w-full accent-purple-500"
                    />
                </div>

                {/* Background Music Volume */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">🎵 Background Music</label>
                        <span className="text-xs font-mono text-purple-400">{Math.round(musicVolume * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={musicVolume}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setMusicVolume(val);
                            onLiveVolumeChange?.('backgroundMusicVolume', val);
                        }}
                        className="w-full accent-purple-500"
                    />
                </div>

                {/* Ambiance Volume */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">🌊 Ambiance</label>
                        <span className="text-xs font-mono text-purple-400">{Math.round(ambianceVolume * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={ambianceVolume}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setAmbianceVolume(val);
                            onLiveVolumeChange?.('ambianceVolume', val);
                        }}
                        className="w-full accent-purple-500"
                    />
                </div>

                {/* SFX Volume */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">🔊 Sound Effects</label>
                        <span className="text-xs font-mono text-purple-400">{Math.round(sfxVolume * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={sfxVolume}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setSfxVolume(val);
                            onLiveVolumeChange?.('globalSfxVolume', val);
                        }}
                        className="w-full accent-purple-500"
                    />
                </div>
            </div>

            {/* Auto-Ducking Toggle UI */}
            <div className="flex items-center justify-between pt-4 border-t border-purple-500/10">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">Intelligent Ducking</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-tighter">Smoothly dip background layers during narration</span>
                </div>
                <button
                    onClick={() => {
                        const newVal = !autoDucking;
                        setAutoDucking(newVal);
                        onLiveVolumeChange?.('autoDucking', newVal);
                    }}
                    className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${autoDucking ? 'bg-purple-600 shadow-lg shadow-purple-500/20' : 'bg-slate-700'}`}
                >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${autoDucking ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
            </div>

            <p className="text-[10px] text-slate-500 text-center italic">
                Adjust levels in real-time during playback. Click "Save Settings" to apply permanently.
            </p>
        </div>
    );
};
