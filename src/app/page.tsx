'use client';

import { useState } from 'react';
import Link from 'next/link';

type EnvironmentMode = 'DEV' | 'STAGING' | 'PRODUCTION';

// Mock data for initial development
const mockProjects = [
  {
    id: '1',
    title: 'The Deep Ocean: Mysteries of the Abyss',
    status: 'scripting',
    estimatedDuration: 120,
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    title: 'Ancient Civilizations: Lost Cities',
    status: 'researching',
    estimatedDuration: 150,
    updatedAt: new Date('2024-01-19'),
  },
];

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
  const [currentMode, setCurrentMode] = useState<EnvironmentMode>('DEV');
  const [budgetUsed] = useState(12.50); // Mock value
  const totalBudget = 300;

  const modeDescriptions: Record<EnvironmentMode, string> = {
    DEV: 'Local emulators, mock AI, zero cost',
    STAGING: 'Real APIs, cheaper models (~$0.50/video)',
    PRODUCTION: 'Full quality, WaveNet voices (~$25/video)',
  };

  const modeColors: Record<EnvironmentMode, string> = {
    DEV: 'bg-emerald-500',
    STAGING: 'bg-amber-500',
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
                {(['DEV', 'STAGING', 'PRODUCTION'] as EnvironmentMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setCurrentMode(mode)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${currentMode === mode
                        ? `${modeColors[mode]} text-white`
                        : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                U
              </div>
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
              <span className="text-white font-medium">{currentMode} Mode</span>
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
            { label: 'Projects', value: '2', icon: '📁' },
            { label: 'Published', value: '0', icon: '🎥' },
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
            {mockProjects.map((project) => (
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
                  <div className="text-slate-500 text-sm">
                    {project.updatedAt.toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
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
    </div>
  );
}
