'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthButton } from '@/components/auth/AuthButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { projectService } from '@/lib/services/firestore';
import { Project } from '@/types';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useEnvironment } from '@/lib/hooks/useEnvironment';
import { EnvironmentMode } from "@/lib/config/environment";
import { useRouter } from 'next/navigation';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  researching: 'bg-blue-500',
  scripting: 'bg-purple-500',
  generating_media: 'bg-orange-500',
  assembling: 'bg-yellow-500',
  review: 'bg-pink-500',
  published: 'bg-green-500',
  archived: 'bg-gray-400',
};

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { mode: currentMode } = useEnvironment();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; projectId: string; title: string; loading: boolean }>({
    isOpen: false,
    projectId: '',
    title: '',
    loading: false
  });
  const [budgetUsed] = useState(12.50); // Mock value
  const totalBudget = 300;

  const handleDeleteClick = (e: React.MouseEvent, projectId: string, projectTitle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteModal({ isOpen: true, projectId, title: projectTitle, loading: false });
  };

  const confirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      await projectService.deleteProject(deleteModal.projectId);
      setProjects(prev => prev.filter(p => p.id !== deleteModal.projectId));
      setDeleteModal({ isOpen: false, projectId: '', title: '', loading: false });
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  const setEnvMode = (newMode: EnvironmentMode) => {
    document.cookie = `x-env-mode=${newMode}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
    window.location.reload();
  };

  useEffect(() => {
    async function loadProjects() {
      if (!user) {
        setProjects([]);
        setIsLoading(false);
        return;
      }

      try {
        const userProjects = await projectService.getUserProjects(user.id);
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

  const modeDescriptions: Record<EnvironmentMode, string> = {
    DEV: 'Local emulators, mock AI, zero cost',
    STAGING: 'Real APIs, cheaper models (~$0.50/video)',
    STAGING_LIMITED: 'Real AI, 1 image/scene, step confirmation',
    PRODUCTION: 'Full quality, WaveNet voices (~$25/video)',
  };

  const modeColors: Record<EnvironmentMode, string> = {
    DEV: 'bg-emerald-500',
    STAGING: 'bg-amber-500',
    STAGING_LIMITED: 'bg-yellow-500',
    PRODUCTION: 'bg-rose-500',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-xl bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-xl">🎬</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">VideoSystem</h1>
                <p className="text-xs text-slate-400">Sleep Documentary Generator</p>
              </div>
            </div>

            {/* Environment Mode Selector */}
            <div className="flex items-center gap-4">
              <div className="flex bg-slate-800 rounded-lg p-1">
                {(['DEV', 'STAGING', 'STAGING_LIMITED', 'PRODUCTION'] as EnvironmentMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setEnvMode(mode)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${currentMode === mode
                      ? `${modeColors[mode]} text-white shadow-lg`
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                  >
                    {mode === 'STAGING_LIMITED' ? 'LIMIT AI' : mode}
                  </button>
                ))}
              </div>

              <Link
                href="/dashboard/health"
                className="p-2 text-slate-400 hover:text-green-400 transition-colors"
                title="System Health"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>

              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Banner */}
        <div className={`mb-8 p-4 rounded-xl ${modeColors[currentMode]}/10 border border-${modeColors[currentMode]}/30`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${modeColors[currentMode]} animate-pulse`}></div>
              <span className="text-white font-medium">
                {currentMode === 'STAGING_LIMITED' ? 'Staging (Limit AI)' :
                  currentMode === 'STAGING' ? 'Staging (Real AI)' :
                    `${currentMode} Mode`}
              </span>
              <span className="text-slate-400 text-sm">• {modeDescriptions[currentMode]}</span>
            </div>
            {currentMode !== 'DEV' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Budget:</span>
                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                    style={{ width: `${(budgetUsed / totalBudget) * 100}%` }}
                  ></div>
                </div>
                <span className="text-white text-sm font-mono">${budgetUsed.toFixed(2)} / ${totalBudget}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/topics"
            className="group p-6 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-2xl border border-indigo-500/30 hover:border-indigo-400/50 transition-all hover:scale-[1.02]"
          >
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-white mb-1">Research Topics</h3>
            <p className="text-sm text-slate-400">Find viral-worthy documentary subjects with SEO analysis</p>
          </Link>

          <Link
            href="/projects/new"
            className="group p-6 bg-gradient-to-br from-emerald-600/20 to-teal-600/20 rounded-2xl border border-emerald-500/30 hover:border-emerald-400/50 transition-all hover:scale-[1.02]"
          >
            <div className="text-3xl mb-3">✨</div>
            <h3 className="text-lg font-semibold text-white mb-1">New Project</h3>
            <p className="text-sm text-slate-400">Start creating a new sleep documentary</p>
          </Link>

          <Link
            href="/settings"
            className="group p-6 bg-gradient-to-br from-slate-600/20 to-slate-700/20 rounded-2xl border border-slate-500/30 hover:border-slate-400/50 transition-all hover:scale-[1.02]"
          >
            <div className="text-3xl mb-3">⚙️</div>
            <h3 className="text-lg font-semibold text-white mb-1">Settings</h3>
            <p className="text-sm text-slate-400">Configure APIs, voice settings, and preferences</p>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Projects', value: projects.length.toString(), icon: '📁' },
            { label: 'Published', value: projects.filter(p => p.status === 'published').length.toString(), icon: '🎥' },
            { label: 'Total Views', value: '0', icon: '👁️' },
            { label: 'Watch Time', value: '0h', icon: '⏱️' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <span>{stat.icon}</span>
                <span className="text-slate-400 text-sm">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Recent Projects */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Projects</h2>
            <Link href="/projects" className="text-indigo-400 hover:text-indigo-300 text-sm">
              View all →
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-12 border border-slate-800 rounded-2xl bg-slate-900/50">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500">Loading your projects...</p>
              </div>
            ) : projects.length > 0 ? (
              projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-2xl">
                        🎬
                      </div>
                      <div>
                        <h3 className="font-medium text-white group-hover:text-indigo-300 transition-colors">
                          {project.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${statusColors[project.status]}`}></span>
                            {project.status.replace('_', ' ')}
                          </span>
                          <span>•</span>
                          <span>{project.estimatedDuration} min</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-slate-500 text-sm" suppressHydrationWarning>
                        {project.updatedAt.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </div>
                      <button
                        onClick={(e) => handleDeleteClick(e, project.id, project.title)}
                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Delete project"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
                <div className="text-4xl mb-4 opacity-20">📁</div>
                <p className="text-slate-500 mb-6">No projects yet. Start by researching a topic!</p>
                <Link
                  href="/topics"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
                >
                  🔍 Research Topics
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sleep Content Guidelines */}
        <div className="p-6 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-2xl border border-indigo-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">😴 Sleep-Optimized Content Guidelines</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <div className="text-indigo-400 font-medium mb-1">Pacing</div>
              <div className="text-slate-300">120-140 WPM</div>
              <div className="text-slate-500 text-xs">Slow, measured delivery</div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <div className="text-indigo-400 font-medium mb-1">Voice</div>
              <div className="text-slate-300">Low, calm tones</div>
              <div className="text-slate-500 text-xs">Consistent volume</div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <div className="text-indigo-400 font-medium mb-1">Visuals</div>
              <div className="text-slate-300">Slow transitions</div>
              <div className="text-slate-500 text-xs">Muted colors</div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <div className="text-indigo-400 font-medium mb-1">Music</div>
              <div className="text-slate-300">60-80 BPM</div>
              <div className="text-slate-500 text-xs">Ambient, low-frequency</div>
            </div>
          </div>
        </div>
      </main>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteModal.title}"? This action is permanent and cannot be undone.`}
        confirmLabel="Delete Project"
        isDestructive={true}
        isLoading={deleteModal.loading}
        onConfirm={confirmDelete}
        onClose={() => setDeleteModal({ isOpen: false, projectId: '', title: '', loading: false })}
      />
    </div>
  );
}
