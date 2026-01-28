'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import { YouTubeTrendResult } from '@/lib/services/youtube';
import { topicService } from '@/lib/services/firestore';
import { TopicSuggestion } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TopicsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isSelecting, setIsSelecting] = useState<number | null>(null);
    const [trends, setTrends] = useState<YouTubeTrendResult[]>([]);
    const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        setError(null);

        try {
            const trendResponse = await fetch(`/api/trends?q=${encodeURIComponent(query)}`);
            if (!trendResponse.ok) throw new Error('Failed to fetch YouTube trends');
            const trendData = await trendResponse.json();
            setTrends(trendData);

            const suggestionResponse = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`);
            if (!suggestionResponse.ok) throw new Error('Failed to fetch suggestions');
            const suggestionData = await suggestionResponse.json();
            setSuggestions(suggestionData);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectTopic = async (suggestion: TopicSuggestion, index: number) => {
        if (!user) return;
        setIsSelecting(index);
        setError(null);

        try {
            const isMockUser = user.id === 'mock-user-123';
            let topicId = '';

            const topicData = {
                userId: user.id,
                title: suggestion.title,
                description: suggestion.description,
                broadCategory: query,
                keywords: suggestion.keywords,
                seoScore: suggestion.seoScore,
                competitionLevel: 'medium' as const,
                searchVolume: 1000,
            };

            if (isMockUser) {
                const res = await fetch('/api/topics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(topicData),
                });
                if (res.ok) {
                    const data = await res.json();
                    topicId = data.topicId;
                } else {
                    throw new Error('Failed to create topic via API');
                }
            } else {
                topicId = await topicService.createTopic(topicData);
            }

            router.push(`/projects/new?topicId=${topicId}`);
        } catch (err: any) {
            setError('Failed to save topic: ' + err.message);
            setIsSelecting(null);
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 mb-2">
                                <span>←</span> Back to Dashboard
                            </Link>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                SEO & Topic Research
                            </h1>
                        </div>
                    </div>

                    {/* Search Section */}
                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl mb-8 backdrop-blur-sm">
                        <form onSubmit={handleSearch} className="flex gap-4">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Enter a broad topic (e.g., 'Ancient Rome', 'Ocean Abyss')"
                                className="flex-1 bg-slate-800 border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={isSearching}
                                className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSearching ? (
                                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    <span>🔍 Search</span>
                                )}
                            </button>
                        </form>
                        {error && <p className="text-red-400 mt-3 text-sm">{error}</p>}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Suggestions Column */}
                        <div>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <span className="text-blue-400">⚡</span> AI Topic Suggestions
                            </h2>
                            <div className="space-y-4">
                                {suggestions.length > 0 ? (
                                    suggestions.map((s, i) => (
                                        <div key={i} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:border-blue-500/50 transition-all group">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg group-hover:text-blue-400 transition-colors">{s.title}</h3>
                                                <div className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-md font-mono">
                                                    Score: {s.seoScore}
                                                </div>
                                            </div>
                                            <p className="text-slate-400 text-sm mb-4">{s.description}</p>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {s.keywords.map(k => (
                                                    <span key={k} className="px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded-md">#{k}</span>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => handleSelectTopic(s, i)}
                                                disabled={isSelecting !== null}
                                                className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                {isSelecting === i ? (
                                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                ) : (
                                                    'Select this Topic'
                                                )}
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-64 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500">
                                        <p>Enter a topic to get AI suggestions</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* YouTube Trends Column */}
                        <div>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <span className="text-red-500">📺</span> YouTube Trends
                            </h2>
                            <div className="space-y-4">
                                {trends.length > 0 ? (
                                    trends.map((t, i) => (
                                        <div key={i} className="flex gap-4 p-4 bg-slate-900/30 border border-slate-800 rounded-2xl">
                                            <img src={t.thumbnails.medium.url} className="w-32 h-20 object-cover rounded-lg" alt="" />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-sm text-slate-200 line-clamp-2 mb-1">{t.title}</h3>
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span>{parseInt(t.viewCount).toLocaleString()} views</span>
                                                    <span>•</span>
                                                    <span>{new Date(t.publishedAt).getFullYear()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-64 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500">
                                        <p>Search reveal trending competition</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
