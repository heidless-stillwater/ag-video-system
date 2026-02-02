import React from 'react';
import { Script } from '@/types';

interface ProjectSidebarProps {
    script: Script | null;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ script }) => {
    return (
        <div className="space-y-6">
            {script && (
                <div className="bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/30 rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="text-purple-400">📊</span> Script Stats
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Total Words</span>
                            <span className="text-white font-bold">{script.totalWordCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Actual Duration</span>
                            <span className="text-white font-bold">{script.estimatedDuration}m</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Sleep Score</span>
                            <span className="text-green-400 font-bold">{script.sleepFriendlinessScore}/100</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Sleep Optimizer</h3>
                <div className="space-y-4">
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/30 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Pacing</span>
                        <span className="text-xs text-indigo-400 font-bold">130 WPM</span>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/30 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Voice</span>
                        <span className="text-xs text-indigo-400 font-bold">Low/Calm</span>
                    </div>
                    <p className="text-[10px] text-slate-500 text-center uppercase tracking-tighter">Guidelines optimally applied for sleep</p>
                </div>
            </div>
        </div>
    );
};
