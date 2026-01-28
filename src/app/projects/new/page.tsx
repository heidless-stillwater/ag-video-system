'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import { topicService, projectService } from '@/lib/services/firestore';
import { Topic } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { StyleSelector } from '@/components/project/StyleSelector';
import { VisualStyle, ProjectStatus } from '@/types';

function NewProjectContent() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const topicId = searchParams.get('topicId');

    const [topic, setTopic] = useState<Topic | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [visualStyle, setVisualStyle] = useState<VisualStyle>('cinematic');

    useEffect(() => {
        async function loadTopic() {
            if (!topicId) {
                setError('No topic selected');
                setIsLoading(false);
                return;
            }

            try {
                const isMockUser = user?.id === 'mock-user-123';
                let topicData: Topic | null = null;

                if (isMockUser) {
                    const res = await fetch(`/api/topics/${topicId}`);
                    if (res.ok) {
                        topicData = await res.json();
                    }
                } else {
                    topicData = await topicService.getTopic(topicId);
                }

                if (topicData) {
                    setTopic(topicData);
                    setTitle(topicData.title);
                    setDescription(topicData.description);
                } else {
                    setError('Topic not found');
                }
            } catch (err: any) {
                setError('Error loading topic: ' + err.message);
            } finally {
                setIsLoading(false);
            }
        }

        loadTopic();
    }, [topicId]);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !topic) return;

        setIsCreating(true);
        setError(null);

        try {
            const isMockUser = user.id === 'mock-user-123';
            let projectId = '';

            const projectData = {
                userId: user.id,
                title,
                description,
                topicId: topic.id,
                status: 'draft' as ProjectStatus,
                research: {
                    sources: [],
                    facts: [],
                    outline: [],
                    completionPercentage: 0,
                },
                estimatedDuration: 120, // Default 2 hours
                estimatedCost: 0,
                visualStyle: visualStyle,
            };

            if (isMockUser) {
                const res = await fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(projectData),
                });
                if (res.ok) {
                    const data = await res.json();
                    projectId = data.projectId;
                } else {
                    throw new Error('Failed to create project via API');
                }
            } else {
                projectId = await projectService.createProject(projectData);
            }

            // Redirect to project editor/dashboard
            router.push(`/projects/${projectId}`);
        } catch (err: any) {
            setError('Failed to create project: ' + err.message);
        } finally {
            setIsCreating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400">Loading topic details...</p>
            </div>
        );
    }

    if (error && !topic) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center max-w-md">
                    <h2 className="text-2xl font-bold text-white mb-4">Oops!</h2>
                    <p className="text-red-400 mb-8">{error}</p>
                    <Link href="/topics" className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors">
                        Back to Topic Research
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                <Link href="/topics" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 mb-6">
                    <span>←</span> Back to Topics
                </Link>

                <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
                <p className="text-slate-400 mb-8">Confirm the details of your sleep documentary project based on your selected topic.</p>

                <form onSubmit={handleCreateProject} className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl backdrop-blur-sm space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Documentary Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter a compelling title"
                                className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white font-medium"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Description / Hook</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the main angle of the documentary"
                                rows={4}
                                className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                <span className="text-xs text-slate-500 block mb-1 uppercase tracking-wider font-bold">Category</span>
                                <span className="text-white font-medium">{topic?.broadCategory}</span>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                <span className="text-xs text-slate-500 block mb-1 uppercase tracking-wider font-bold">SEO Score</span>
                                <span className="text-blue-400 font-bold">{topic?.seoScore}/100</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-4">Visual Aesthetic</label>
                            <StyleSelector
                                selectedStyle={visualStyle}
                                onStyleSelect={setVisualStyle}
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isCreating ? (
                                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                '✨ Start Project'
                            )}
                        </button>
                        <Link
                            href="/topics"
                            className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function NewProjectPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={
                <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                </div>
            }>
                <NewProjectContent />
            </Suspense>
        </ProtectedRoute>
    );
}
