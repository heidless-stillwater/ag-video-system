'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { projectService } from '@/lib/services/firestore';
import { Project } from '@/types';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useEnvironmentContext } from '@/lib/contexts/EnvironmentContext';
import { useRouter } from 'next/navigation';
import { CreditBalanceDashboard } from '@/components/billing/CreditBalanceDashboard';
import { PromptToolMediaPicker } from '@/components/media/PromptToolMediaPicker';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { LandingPage } from '@/components/layout/LandingPage';
import { RequireRole } from '@/components/auth/RequireRole';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const statusColors: Record<string, string> = {
  draft: 'bg-slate-500',
  researching: 'bg-blue-500',
  scripting: 'bg-purple-500',
  generating_media: 'bg-orange-500',
  assembling: 'bg-yellow-500',
  review: 'bg-pink-500',
  published: 'bg-emerald-500',
  archived: 'bg-slate-400',
};

export default function Dashboard() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { mode: currentMode } = useEnvironmentContext();
  const { theme } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    projectId: '',
    title: '',
    loading: false
  });
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      if (!user) {
        setProjects([]);
        setIsLoading(false);
        return;
      }

      try {
        const isMockUser = user.id === 'mock-user-123';
        let userProjects: Project[] = [];

        if (isMockUser) {
          const res = await fetch(`/api/projects?userId=${user.id}`);
          if (res.ok) {
            const data = await res.json();
            userProjects = data.map((p: any) => ({
              ...p,
              createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
              updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
            }));
          }
        } else {
          userProjects = await projectService.getUserProjects(user.id);
        }

        setProjects(userProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      loadProjects();
    }
  }, [user, authLoading]);

  const handleDeleteClick = (e: React.MouseEvent, projectId: string, projectTitle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteModal({ isOpen: true, projectId, title: projectTitle, loading: false });
  };

  const confirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      const isMockUser = user?.id === 'mock-user-123';
      if (isMockUser) {
        await fetch(`/api/projects/${deleteModal.projectId}`, { method: 'DELETE' });
      } else {
        await projectService.deleteProject(deleteModal.projectId);
      }
      setProjects(prev => prev.filter(p => p.id !== deleteModal.projectId));
      setDeleteModal({ isOpen: false, projectId: '', title: '', loading: false });
    } catch (error) {
      console.error('Error deleting project:', error);
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Helper for Theme-specific card styles
  const getCardStyle = (baseAccent: string) => {
    switch (theme) {
      case 'intel': return `theme-card border-blue-500/20 rounded-3xl p-8 hover:border-blue-500/50`;
      case 'saas': return `bg-gradient-to-br from-${baseAccent}-600/20 to-slate-800/20 rounded-[40px] border border-${baseAccent}-500/30 p-8 hover:scale-[1.02] shadow-xl hover:shadow-${baseAccent}-500/10`;
      case 'cyber': return `bg-black border border-emerald-500/30 rounded-none p-6 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]`;
      case 'midnight': return `bg-slate-900/50 border border-slate-700/30 rounded-3xl p-8 hover:bg-slate-800/80`;
      case 'smart-casual': return `bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl hover:bg-slate-700/50 transition-all active:scale-[0.98]`;
      default: return `theme-card p-6 border-white/5 font-mono`;
    }
  };

  if (authLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-bounce mb-6">
                <span className="text-3xl">🎬</span>
            </div>
            <p className="text-xs font-black tracking-[0.4em] text-slate-700 animate-pulse-slow uppercase">SYNCING_STATION_DATA...</p>
        </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className={`min-h-screen ${
      theme === 'saas' ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' : 
      theme === 'smart-casual' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' :
      'bg-transparent'
    } text-white transition-all duration-700`}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        
        {/* HERO SECTION - RE-STYLED BY THEME */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16 px-4">
            <div className={theme === 'smart-casual' ? 'bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl w-full' : ''}>
                {theme === 'intel' ? (
                  <>
                    <div className="flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-left-4">
                        <span className="text-xs font-black theme-accent-text tracking-widest uppercase italic border-l-2 border-blue-500 pl-3">STATION_DEFI</span>
                        <span className="text-slate-800">/</span>
                        <span className="text-xs font-black text-slate-500 tracking-widest uppercase italic">ACTIVE_OPERATIONS</span>
                    </div>
                    <h1 className="text-6xl font-black italic tracking-tighter leading-none mb-4 uppercase">COMMAND_STATION</h1>
                    <p className="text-slate-500 max-w-xl text-lg font-medium leading-relaxed italic border-l border-slate-800 pl-4">Centralized intelligence nexus for documentary synthesis and audio optimization.</p>
                  </>
                ) : theme === 'saas' || theme === 'smart-casual' ? (
                  <>
                    <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome back, {user?.displayName?.split(' ')[0] || 'Admiral'}</h1>
                    <p className="text-slate-400 text-lg font-medium max-w-xl">Managed environments and system tools are ready for your next deployment.</p>
                  </>
                ) : theme === 'cyber' ? (
                  <>
                    <div className="mb-4 text-emerald-500 font-mono text-sm tracking-widest animate-pulse">&gt; INITIALIZING_OPERATOR_INTERFACE...</div>
                    <h1 className="text-7xl font-black italic tracking-[0.05em] leading-none mb-2 text-white border-b-4 border-emerald-500 pb-2">SYS_DASHBOARD</h1>
                    <p className="text-emerald-500/60 font-mono text-xs uppercase tracking-widest">Target confirmed. Systems online. Data stream active.</p>
                  </>
                ) : (
                  <>
                    <h1 className="text-4xl font-black tracking-widest theme-header uppercase mb-4 italic text-slate-300">Station_Alpha</h1>
                    <p className="text-slate-500 font-medium">Operational overview and project management.</p>
                  </>
                )}
            </div>
            {currentMode !== 'DEV' && (
                <div className={`${theme === 'saas' ? 'p-2 bg-slate-800/50 rounded-2xl border border-white/5' : ''}`}>
                    <CreditBalanceDashboard />
                </div>
            )}
        </div>

        {/* QUICK ACTIONS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          <Link href="/topics" className={getCardStyle('indigo')}>
            <div className={`relative z-10 flex flex-col h-full`}>
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-3 py-1 ${theme === 'cyber' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'} text-[10px] font-black uppercase rounded-lg tracking-widest`}>
                    {theme === 'intel' ? 'TARGET_EXTRACTION' : 'Research'}
                  </span>
                  <div className="text-4xl">🔍</div>
                </div>
                <h3 className={`text-2xl font-black tracking-tight leading-7 uppercase theme-header mb-2`}>
                   {theme === 'intel' || theme === 'cyber' ? 'INTELLIGENCE_ENGINE' : 'Topic Research'}
                </h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">Identify high-potential documentary subjects using SEO telemetry.</p>
            </div>
          </Link>

          <Link href="/research" className={getCardStyle('blue')}>
            <div className={`relative z-10 flex flex-col h-full`}>
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase rounded-lg tracking-widest`}>
                    {theme === 'intel' ? 'DEEP_INVESTIGATION' : 'Agents'}
                  </span>
                  <div className="text-4xl">🔬</div>
                </div>
                <h3 className={`text-2xl font-black tracking-tight leading-7 uppercase theme-header mb-2`}>
                   {theme === 'intel' || theme === 'cyber' ? 'RESEARCH_PHASE' : 'Research Dashboard'}
                </h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">Synthesize cross-channel research via specialized intelligence agents.</p>
            </div>
          </Link>

          <Link href="/projects/new" className={getCardStyle('emerald')}>
            <div className={`relative z-10 flex flex-col h-full`}>
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase rounded-lg tracking-widest`}>
                    {theme === 'intel' ? 'PRODUCTION_START' : 'New'}
                  </span>
                  <div className="text-4xl">✨</div>
                </div>
                <h3 className={`text-2xl font-black tracking-tight leading-7 uppercase theme-header mb-2`}>
                   {theme === 'intel' || theme === 'cyber' ? 'INITIATE_PROJECT' : 'New Project'}
                </h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">Deploy a new documentary production cycle from verified intelligence.</p>
            </div>
          </Link>

          <Link href="/media-library" className={`${getCardStyle('amber')} text-left`}>
            <div className={`relative z-10 flex flex-col h-full`}>
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-3 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase rounded-lg tracking-widest`}>
                    {theme === 'intel' ? 'ASSET_REPOSITORY' : 'Library'}
                  </span>
                  <div className="text-4xl">🖼️</div>
                </div>
                <h3 className={`text-2xl font-black tracking-tight leading-7 uppercase theme-header mb-2`}>
                   {theme === 'intel' || theme === 'cyber' ? 'MEDIA_CATALOG' : 'Media Library'}
                </h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">Browse synthesized visual assets and community highlights.</p>
            </div>
          </Link>

          <Link href="/settings" className={getCardStyle('slate')}>
            <div className={`relative z-10 flex flex-col h-full`}>
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-3 py-1 bg-slate-700/20 text-slate-400 text-[10px] font-black uppercase rounded-lg tracking-widest`}>
                    {theme === 'intel' ? 'CORE_CONFIG' : 'System'}
                  </span>
                  <div className="text-4xl">⚙️</div>
                </div>
                <h3 className={`text-2xl font-black tracking-tight leading-7 uppercase theme-header mb-2`}>
                   {theme === 'intel' || theme === 'cyber' ? 'STATION_PREFS' : 'Settings'}
                </h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">Adjust system parameters, API linkages, and voice profile settings.</p>
            </div>
          </Link>

          {isAdmin && (
            <Link href="/admin/tools" className={getCardStyle('rose')}>
              <div className={`relative z-10 flex flex-col h-full`}>
                  <div className="flex justify-between items-start mb-6">
                    <span className={`px-3 py-1 bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase rounded-lg tracking-widest`}>
                      {theme === 'intel' ? 'SYSTEM_PRIVILEGE' : 'Admin'}
                    </span>
                    <div className="text-4xl">🔧</div>
                  </div>
                  <h3 className={`text-2xl font-black tracking-tight leading-7 uppercase theme-header mb-2`}>
                    {theme === 'intel' || theme === 'cyber' ? 'ADMIN_TERMINAL' : 'Admin Tools'}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">Advanced system diagnostics, credit manipulation, and migration tools.</p>
              </div>
            </Link>
          )}
        </div>

        {/* STATS STRIP */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 mb-24 px-4 ${theme === 'cyber' ? 'font-mono' : ''}`}>
            {[
                { label: 'ACTIVE_PROJECTS', value: projects.length, icon: '📁' },
                { label: 'COMPLETED_MISSIONS', value: projects.filter(p => p.status === 'published').length, icon: '🎞️' },
                { label: 'NETWORK_REACH', value: '1.2M', icon: '🌐' },
                { label: 'UPTIME', value: '99.9%', icon: '⏱️' }
            ].map((stat, i) => (
                <div key={stat.label} className={`border-l-2 ${theme === 'saas' ? 'border-blue-500/20 bg-blue-500/5 p-6 rounded-r-3xl border-r border-y border-white/5' : 'border-white/5 pl-6'} group animate-in fade-in slide-in-from-left-4 duration-700`} style={{ animationDelay: `${i * 100}ms` }}>
                    <span className={`block text-[10px] font-black ${theme === 'cyber' ? 'text-emerald-500 animate-pulse' : 'text-slate-600'} tracking-[0.2em] mb-2 group-hover:theme-accent-text transition-colors uppercase`}>{stat.label}</span>
                    <p className={`text-4xl font-black theme-header tracking-tighter text-white`}>{stat.value}</p>
                </div>
            ))}
        </div>

        {/* RECENT PROJECTS SECTION */}
        <div className="mb-20">
            <div className="flex items-center justify-between mb-8 px-4">
                <h2 className={`text-2xl font-black flex items-center gap-3 uppercase theme-header`}>
                    <span className={`w-2 h-8 ${theme === 'cyber' ? 'bg-emerald-500' : 'bg-[var(--accent)]'} ${theme === 'saas' ? 'rounded-full' : ''}`}></span> 
                    {theme === 'saas' ? 'Recent Activity' : 'DOC_PRODUCTION_LOGS'}
                </h2>
                <Link href="/projects" className={`text-[10px] font-black tracking-widest text-slate-500 hover:text-white transition-colors uppercase theme-header italic border-b border-white/5 pb-1`}>
                   {theme === 'saas' ? 'All Projects' : 'VIEW_ALL_LOGS'} →
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {isLoading ? (
                    <div className="h-40 theme-card rounded-[32px] flex items-center justify-center animate-pulse">
                        <span className="text-xs font-black text-slate-700 tracking-widest uppercase italic font-mono">SYNCING_PROJECT_DATABASE...</span>
                    </div>
                ) : projects.length > 0 ? (
                    projects.map((project, i) => (
                        <Link
                            key={project.id}
                            href={`/projects/${project.id}`}
                            className={`group ${theme === 'saas' ? 'bg-slate-800/40 border-white/5 rounded-[32px] hover:bg-slate-800 hover:scale-[1.01]' : 'theme-card border-slate-800/80 rounded-2xl'} p-6 transition-all flex items-center justify-between`}
                        >
                            <div className="flex items-center gap-6">
                                <div className={`w-14 h-14 ${theme === 'saas' ? 'bg-indigo-500/10 text-white shadow-xl rotate-3' : 'bg-white/5'} rounded-2xl flex items-center justify-center text-2xl group-hover:rotate-0 transition-transform`}>
                                    🎬
                                </div>
                                <div>
                                    <h3 className={`text-xl font-black theme-header tracking-tight uppercase group-hover:theme-accent-text transition-colors`}>{project.title}</h3>
                                    <div className="flex items-center gap-4 text-[10px] font-black tracking-widest uppercase mt-1">
                                        <span className={`px-2 py-0.5 rounded ${statusColors[project.status]} text-black`}>{project.status.replace('_', ' ')}</span>
                                        <span className="text-slate-600">{project.broadCategory || 'UNCLASSIFIED'}</span>
                                        <span className="text-slate-600 font-mono italic">{project.estimatedDuration} MIN_RUNTIME</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right hidden sm:block">
                                    <span className="block text-[8px] font-black text-slate-700 tracking-widest uppercase leading-none mb-1">LAST_MODIFIED</span>
                                    <span className="text-xs font-black text-slate-500">{project.updatedAt?.toLocaleDateString ? project.updatedAt.toLocaleDateString('en-GB') : 'N/A'}</span>
                                </div>
                                <button
                                    onClick={(e) => handleDeleteClick(e, project.id, project.title)}
                                    className="p-3 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="h-64 theme-card rounded-[40px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 italic">
                        <span className="text-sm font-black text-slate-800 tracking-widest uppercase theme-header mb-8">NO_ACTIVE_CYCLES_DETECTED</span>
                        <Link href="/topics" className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-full text-xs font-black tracking-widest transition-all uppercase">START_NEW_MISSION</Link>
                    </div>
                )}
            </div>
        </div>

        {/* GUIDELINES BANNER */}
        <div className={`relative group overflow-hidden ${theme === 'saas' ? 'bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[50px]' : 'bg-white/[0.02] border border-white/5 rounded-[40px]'} p-12 transition-all duration-500`}>
            <div className={`absolute top-0 right-0 w-96 h-96 ${theme === 'saas' ? 'bg-white/10' : 'bg-[var(--accent)]/5'} rounded-full blur-[100px] -mr-48 -mt-48 group-hover:bg-opacity-20 transition-all duration-1000`}></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12 text-center md:text-left">
                <div className="max-w-xl">
                    <span className={`text-[10px] font-black ${theme === 'saas' ? 'text-white/60' : 'theme-accent-text'} tracking-[0.3em] uppercase mb-4 block theme-header`}>AUDIOLOGY_OPTIMIZATION_PROTOCOL</span>
                    <h3 className={`text-3xl font-black theme-header tracking-tighter uppercase mb-6 leading-none ${theme === 'saas' ? 'text-white' : ''}`}>SLEEP-GEN_CORE_PARAMETERS</h3>
                    <p className={`${theme === 'saas' ? 'text-white/80' : 'text-slate-500'} font-medium italic mb-8 uppercase text-[12px] tracking-wide`}>System protocols indicate 120-140 WPM narration at 60-80 BPM ambient modulation for maximum sleep induction efficiency.</p>
                </div>
                <div className="flex gap-4">
                    <div className={`p-6 ${theme === 'saas' ? 'bg-white/10 shadow-lg' : 'theme-card'} rounded-3xl text-center min-w-[120px]`}>
                        <span className={`text-2xl font-black ${theme === 'saas' ? 'text-white' : 'theme-accent-text'} block mb-1`}>120+</span>
                        <span className={`text-[8px] font-black ${theme === 'saas' ? 'text-white/60' : 'text-slate-600'} tracking-widest uppercase`}>WPM_TARGET</span>
                    </div>
                    <div className={`p-6 ${theme === 'saas' ? 'bg-white/10 shadow-lg' : 'theme-card'} rounded-3xl text-center min-w-[120px]`}>
                        <span className={`text-2xl font-black ${theme === 'saas' ? 'text-white' : 'text-[var(--accent-secondary)]'} block mb-1 font-mono`}>ALPHA</span>
                        <span className={`text-[8px] font-black ${theme === 'saas' ? 'text-white/60' : 'text-slate-600'} tracking-widest uppercase`}>AUDIO_WAVE</span>
                    </div>
                </div>
            </div>
        </div>

      </main>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Operation?"
        message={`Confirm permanent deletion of mission file "${deleteModal.title}". This data cannot be decrypted after erasure.`}
        confirmLabel="ERASE_PROJECT"
        isDestructive={true}
        isLoading={deleteModal.loading}
        onConfirm={confirmDelete}
        onClose={() => setDeleteModal({ isOpen: false, projectId: '', title: '', loading: false })}
      />
      
      <PromptToolMediaPicker
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(img) => console.log('Asset selected:', img)}
      />
    </div>
  );
}
