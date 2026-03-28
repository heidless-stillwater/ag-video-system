
import React from 'react';
import { Project, Script, User } from '@/types';
import { pricingService } from '@/lib/services/pricing-service';

interface ProjectCreditEstimateProps {
    project: Project;
    script: Script | null;
    user: User | null;
    className?: string;
    showDraftInfo?: boolean;
}

export const ProjectCreditEstimate: React.FC<ProjectCreditEstimateProps> = ({ 
    project, 
    script, 
    user, 
    className = '',
    showDraftInfo = false
}) => {
    if (!user) return null;

    const isAdmin = user.roles.includes('admin') || user.roles.includes('su');
    const estimate = pricingService.calculateEstimate(project, script, user.plan);
    const hasSufficient = user.creditBalance >= estimate.durationTotal;
    const isLow = !hasSufficient && user.creditBalance > 0;
    
    const statusColor = hasSufficient 
        ? 'text-green-400' 
        : isLow 
            ? 'text-yellow-400' 
            : 'text-red-500';

    const statusBorder = hasSufficient 
        ? 'border-green-500/20' 
        : isLow 
            ? 'border-yellow-500/20' 
            : 'border-red-500/20';

    return (
        <div className={`p-5 rounded-3xl bg-gradient-to-br from-slate-900/80 to-purple-900/20 border border-slate-700/50 backdrop-blur-xl shadow-2xl ${className} animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden`}>
            {/* Status Indicator Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 -mr-16 -mt-16 transition-colors duration-700 ${
                hasSufficient ? 'bg-green-500' : isLow ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>

            <div className="flex items-center justify-between mb-4 relative z-10">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] ${statusColor} bg-current`}></span>
                    Credit Forecast
                </h4>
                {estimate.multiplier < 1 && (
                    <span className="px-2 py-1 rounded-lg bg-green-500/10 text-green-400 text-[10px] font-bold border border-green-500/20 uppercase tracking-tighter">
                        {Math.round((1 - estimate.multiplier) * 100)}% Plan Savings
                    </span>
                )}
            </div>

            <div className="space-y-4 relative z-10">
                {/* User View: Duration Model */}
                <div className="group relative">
                    <div className={`absolute -inset-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition duration-500 rounded-2xl blur ${
                        hasSufficient ? 'from-green-500/20 to-emerald-500/20' : isLow ? 'from-yellow-500/20 to-orange-500/20' : 'from-red-500/20 to-pink-500/20'
                    }`}></div>
                    <div className={`relative flex justify-between items-center bg-slate-800/40 p-3 rounded-2xl border transition-all ${statusBorder}`}>
                        <div>
                            <span className="text-xs font-bold text-slate-200">Standard Estimate</span>
                            <p className="text-[9px] text-slate-500 font-medium leading-relaxed max-w-[140px] mt-1">{pricingService.getModelDescription('duration')}</p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-baseline gap-1 justify-end">
                                <span className={`text-2xl font-black tracking-tighter transition-colors duration-500 ${statusColor}`}>{estimate.durationTotal}</span>
                                <span className="text-[10px] font-bold text-indigo-400 uppercase">Credits</span>
                            </div>
                            {!hasSufficient && (
                                <p className={`text-[8px] font-bold uppercase mt-0.5 ${statusColor}`}>
                                    {isLow ? 'Top-up Recommended' : 'Insufficient Balance'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Admin View: Action Model */}
                {isAdmin && (
                    <div className="relative overflow-hidden pt-4 border-t border-slate-800/50 mt-2">
                        <div className="absolute -left-10 -top-10 w-24 h-24 bg-purple-500/10 rounded-full blur-3xl"></div>
                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide">Admin: Internal Node Balance</span>
                                    <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[8px] font-black uppercase tracking-widest border border-purple-500/30">Debug</span>
                                </div>
                                <p className="text-[9px] text-slate-600 font-medium mt-1 uppercase tracking-tighter">{pricingService.getModelDescription('action')}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-black text-slate-400 tracking-tighter">{estimate.actionTotal} <span className="text-[8px] text-slate-600">UNIT</span></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showDraftInfo && (
                <div className="mt-4 pt-3 border-t border-slate-800/50">
                    <p className="text-[9px] text-slate-600 font-medium italic flex gap-2">
                        <span className="text-indigo-500/50 self-start">✦</span>
                        Forecast verified for a {project.estimatedDuration}m master edit. Dynamic sections incur per-action costs during synthesis.
                    </p>
                </div>
            )}
        </div>
    );
};
