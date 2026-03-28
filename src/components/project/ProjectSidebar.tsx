import React from 'react';
import { Project, Script, User } from '@/types';
import { ProjectCreditEstimate } from './ProjectCreditEstimate';

interface ProjectSidebarProps {
    project: Project;
    script: Script | null;
    user: User | null;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ project, script, user }) => {
    return (
        <div className="space-y-6">
            <ProjectCreditEstimate 
                project={project}
                script={script}
                user={user}
            />

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
                            <span className="text-slate-400">Target Duration</span>
                            <span className="text-slate-500 font-mono text-xs">{project.targetDuration || project.estimatedDuration || 1}m</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-white/5 pt-2 mt-2">
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
                        <span className="text-xs text-indigo-400 font-bold">{project.targetPacing || 130} WPM</span>
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
