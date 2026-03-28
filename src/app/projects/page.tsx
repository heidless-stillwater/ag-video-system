'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { projectService } from '@/lib/services/firestore';
import { Project } from '@/types';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

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

function ProjectsContent() {
    const { user, loading: authLoading } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; projectId: string; title: string; loading: boolean }>({
        isOpen: false,
        projectId: '',
        title: '',
        loading: false
    });

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
                const res = await fetch(`/api/projects/${deleteModal.projectId}`, {
                    method: 'DELETE',
                });
                if (!res.ok) throw new Error('Failed to delete project via API');
            } else {
                await projectService.deleteProject(deleteModal.projectId);
            }

            setProjects(prev => prev.filter(p => p.id !== deleteModal.projectId));
            setDeleteModal({ isOpen: false, projectId: '', title: '', loading: false });
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Failed to delete project. Please try again.');
            setDeleteModal(prev => ({ ...prev, loading: false }));
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 mb-2">
                            <span>←</span> Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            My Projects
                        </h1>
                    </div>
                    <Link
                        href="/topics"
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                        <span>✨</span> New Project
                    </Link>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-20">
                            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-400">Loading projects...</p>
                        </div>
                    ) : projects.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-800/50 border-b border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-400">Project</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-400">Status</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-400">Duration</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-400">Last Updated</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {projects.map((project) => (
                                        <tr key={project.id} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <Link href={`/projects/${project.id}`} className="block">
                                                    <div className="font-bold text-white group-hover:text-blue-400 transition-colors">{project.title}</div>
                                                    <div className="text-xs text-slate-500 truncate max-w-xs">{project.description}</div>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="flex items-center gap-2 text-sm text-slate-300">
                                                    <span className={`w-2 h-2 rounded-full ${statusColors[project.status] || 'bg-slate-500'}`}></span>
                                                    {project.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-400">
                                                {project.estimatedDuration} min
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-400">
                                                {project.updatedAt?.toLocaleDateString ? project.updatedAt.toLocaleDateString('en-GB') : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={(e) => handleDeleteClick(e, project.id, project.title)}
                                                    className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                    title="Delete project"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-20 text-center">
                            <div className="text-6xl mb-6 opacity-20">📁</div>
                            <h3 className="text-xl font-bold text-white mb-2">No projects found</h3>
                            <p className="text-slate-400 mb-8 max-w-sm">You haven't created any documentaries yet. Start by exploring topics and creating your first project.</p>
                            <Link
                                href="/topics"
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
                            >
                                🔍 Exploration Topics
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title="Delete Project"
                message={`Are you sure you want to delete "${deleteModal.title}"? This action is permanent.`}
                confirmLabel="Delete"
                isDestructive={true}
                isLoading={deleteModal.loading}
                onConfirm={confirmDelete}
                onClose={() => setDeleteModal({ isOpen: false, projectId: '', title: '', loading: false })}
            />
        </div>
    );
}

export default function ProjectsPage() {
    return (
        <ProtectedRoute>
            <ProjectsContent />
        </ProtectedRoute>
    );
}
