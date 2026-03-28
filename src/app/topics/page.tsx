'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import { YouTubeTrendResult } from '@/lib/services/youtube';
import { topicService } from '@/lib/services/firestore';
import { TopicSuggestion } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TopicIntelligence } from '@/lib/services/topic-intelligence';

export default function TopicsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isSelecting, setIsSelecting] = useState<number | null>(null);
    const [trends, setTrends] = useState<YouTubeTrendResult[]>([]);
    const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
    const [topicAnalysis, setTopicAnalysis] = useState<TopicIntelligence | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [personas, setPersonas] = useState<any[]>([]);
    const [selectedPersona, setSelectedPersona] = useState<string>('standard');
    const { authFetch } = useAuth();

    const performSearch = async (searchTerm: string) => {
        setIsSearching(true);
        setError(null);

        try {
            // 1. YouTube Trends
            const trendResponse = await fetch(`/api/trends?q=${encodeURIComponent(searchTerm)}`);
            if (!trendResponse.ok) throw new Error('Failed to fetch YouTube trends');
            const trendData = await trendResponse.json();
            setTrends(trendData);

            // 2. AI Suggestions
            const suggestionResponse = await fetch(`/api/suggestions?q=${encodeURIComponent(searchTerm)}`);
            if (!suggestionResponse.ok) throw new Error('Failed to fetch suggestions');
            const suggestionData = await suggestionResponse.json();
            setSuggestions(suggestionData);

            // 3. Deep Topic Intelligence
            const analysisResponse = await fetch('/api/topics/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: searchTerm })
            });
            if (analysisResponse.ok) {
                const data = await analysisResponse.json();
                setTopicAnalysis(data.analysis);
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSearching(false);
            setIsInitialLoading(false);
        }
    };

    // Load from localStorage on mount
    useEffect(() => {
        const savedQuery = localStorage.getItem('research_query');
        const savedTrends = localStorage.getItem('research_trends');
        const savedSuggestions = localStorage.getItem('research_suggestions');

        if (savedQuery) {
            setQuery(savedQuery);
        } else {
            const defaultTopics = ['Ancient Civilizations', 'Deep Ocean Mysteries', 'Sleep Documentaries', 'World History', 'Nature Wonders'];
            const randomTopic = defaultTopics[Math.floor(Math.random() * defaultTopics.length)];
            setQuery(randomTopic);
        }

        if (savedTrends) {
            try { setTrends(JSON.parse(savedTrends)); } catch (e) { console.error(e); }
        }
        if (savedSuggestions) {
            try { setSuggestions(JSON.parse(savedSuggestions)); } catch (e) { console.error(e); }
        }
        
        setIsInitialLoading(false);

        // Fetch Personas
        authFetch('/api/research/personas')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setPersonas(data.personas);
                    const saved = localStorage.getItem('last_research_persona');
                    if (saved) setSelectedPersona(saved);
                    else if (data.personas.length > 0) setSelectedPersona(data.personas[0].id);
                }
            })
            .catch(err => console.error('Failed to load personas', err));
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        performSearch(query);
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

            router.push(`/projects/new?topicId=${topicId}&personaId=${selectedPersona}`);
        } catch (err: any) {
            setError('Failed to save topic: ' + err.message);
            setIsSelecting(null);
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 pt-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 mb-2 text-sm italic">
                                🛸 Back to Dashboard
                            </Link>
                            <h1 className="text-4xl font-black theme-header theme-accent-text tracking-tighter">
                                TOPIC INTELLIGENCE ENGINE
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">Data-driven research for viral sleep documentaries</p>
                        </div>
                    </div>

                    {/* Search Section */}
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl mb-12 shadow-2xl shadow-blue-500/5 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-blue-500/10 transition-colors"></div>
                        <form onSubmit={handleSearch} className="flex gap-4 relative z-10">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Enter a broad topic (e.g., 'Ancient Civilizations', 'Sleep Neurobiology')"
                                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-all text-lg placeholder:text-slate-600"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-mono text-xs">TARGET_TOPIC</span>
                            </div>
                            <button
                                type="submit"
                                disabled={isSearching}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-10 py-4 rounded-2xl font-black shadow-lg shadow-blue-900/40 transition-all disabled:opacity-50 flex items-center gap-3 active:scale-95"
                            >
                                {isSearching ? (
                                    <span className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    <><span>ANALYZE</span><span className="opacity-50">→</span></>
                                )}
                            </button>
                        </form>
                        {error && <p className="text-rose-400 mt-4 text-sm font-medium">⚠️ {error}</p>}
                    </div>

                    {/* Persona Selector Section - HIDDEN BY USER REQUEST */}
                    {/* 
                    <div className="mb-12">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3 px-2">
                            <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 text-sm">👤</span>
                            ACTIVE RESEARCH AGENT
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {personas.map(persona => (
                                <button
                                    key={persona.id}
                                    onClick={() => {
                                        setSelectedPersona(persona.id);
                                        localStorage.setItem('last_research_persona', persona.id);
                                    }}
                                    className={`p-4 rounded-2xl border-2 transition-all text-center flex flex-col items-center gap-2 group relative overflow-hidden ${
                                        selectedPersona === persona.id
                                            ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/40 scale-105 z-10'
                                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    <span className={`text-2xl transition-transform duration-300 ${selectedPersona === persona.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                                        {persona.emoji || '🤖'}
                                    </span>
                                    <span className={`text-[10px] font-black uppercase tracking-tight line-clamp-1 ${selectedPersona === persona.id ? 'text-white' : 'text-slate-400'}`}>
                                        {persona.name}
                                    </span>
                                    {selectedPersona === persona.id && (
                                        <div className="absolute top-1 right-1">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                    */}

                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                        {/* Intelligence Cards Column (Span 3) */}
                        <div className="xl:col-span-3 space-y-8">
                            {/* Intelligence Panel */}
                            {topicAnalysis && (
                                <div className="theme-card rounded-3xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="text-2xl font-black flex items-center gap-3 theme-header">
                                            <span className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center theme-accent-text italic">📊</span>
                                            STRATEGIC_INSIGHTS: {topicAnalysis.topic}
                                        </h2>
                                        <div className="flex gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                                                topicAnalysis.suggestedFormat === 'mystery' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'
                                            }`}>
                                                Format: {topicAnalysis.suggestedFormat}
                                            </span>
                                            <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-black uppercase text-slate-400">
                                                Volume: {topicAnalysis.searchVolume}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        {[
                                            { label: 'Viral Potential', value: topicAnalysis.scores.viralPotential, color: 'text-rose-400', bg: 'bg-rose-400' },
                                            { label: 'Educational Depth', value: topicAnalysis.scores.educational, color: 'text-blue-400', bg: 'bg-blue-400' },
                                            { label: 'Evergreen Value', value: topicAnalysis.scores.evergreen, color: 'text-emerald-400', bg: 'bg-emerald-400' },
                                            { label: 'Complexity', value: topicAnalysis.scores.complexity, color: 'text-amber-400', bg: 'bg-amber-400' },
                                        ].map(score => (
                                            <div key={score.label} className="bg-slate-950 p-6 rounded-2xl border border-slate-800/50">
                                                <div className="flex justify-between items-end mb-4">
                                                    <span className="text-sm font-bold text-slate-500 uppercase tracking-tighter">{score.label}</span>
                                                    <span className={`text-2xl font-black ${score.color}`}>{score.value}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${score.bg} transition-all duration-1000 ease-out`}
                                                        style={{ width: `${score.value}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="mt-8 flex gap-3 flex-wrap">
                                        {topicAnalysis.keywords.map(kw => (
                                            <span key={kw} className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 text-sm font-medium">#{kw}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Suggestions Section */}
                            <div>
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-3 px-2">
                                    <span className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 text-sm">💡</span>
                                    AI-GEN TOPIC ANGLE SUGGESTIONS
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {suggestions.length > 0 ? (
                                        suggestions.map((s, i) => (
                                            <div key={i} className="p-6 bg-slate-900 border-2 border-slate-800 rounded-3xl hover:border-blue-500/30 transition-all group relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors"></div>
                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <h3 className="font-extrabold text-xl group-hover:text-blue-400 transition-colors leading-tight">{s.title}</h3>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">SEO_SCORE</span>
                                                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-lg font-black border border-blue-500/20">
                                                                {s.seoScore}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-slate-400 text-sm mb-6 leading-relaxed line-clamp-3">{s.description}</p>
                                                    <div className="flex flex-wrap gap-2 mb-6">
                                                        {s.keywords.map(k => (
                                                            <span key={k} className="px-2 py-0.5 bg-slate-800 text-slate-500 text-[10px] uppercase font-bold rounded tracking-wider">{k}</span>
                                                        ))}
                                                    </div>
                                                    <button
                                                        onClick={() => handleSelectTopic(s, i)}
                                                        disabled={isSelecting !== null}
                                                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 hover:text-white disabled:opacity-50 text-slate-300 rounded-2xl text-sm font-black transition-all border border-slate-700/50 flex items-center justify-center gap-2 group/btn"
                                                    >
                                                        {isSelecting === i ? (
                                                            <span className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                        ) : (
                                                            <>SELECT MISSION <span className="group-hover/btn:translate-x-1 transition-transform">→</span></>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-2 h-48 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-500 italic">
                                            Enter a target topic above for AI angle extraction...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Recent Trends Column */}
                        <div className="space-y-8">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-3 px-2 text-rose-500">
                                <span className="w-8 h-8 bg-rose-500/20 rounded-lg flex items-center justify-center text-rose-400 text-sm">📺</span>
                                GLOBAL TRENDS
                            </h2>
                            <div className="space-y-4">
                                {trends.length > 0 ? (
                                    trends.map((t, i) => (
                                        <div key={i} className="group p-4 bg-slate-900/50 border border-slate-800 rounded-2xl transition-all hover:bg-slate-900">
                                            <div className="relative mb-3 aspect-video rounded-xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                                                <img src={t.thumbnails.medium.url} className="w-full h-full object-cover" alt="" />
                                                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-[10px] font-bold rounded">YT_DATA</div>
                                            </div>
                                            <h3 className="font-bold text-xs text-slate-300 line-clamp-2 mb-2 group-hover:text-blue-400 transition-colors uppercase leading-tight">{t.title}</h3>
                                            <div className="flex items-center justify-between text-[10px] font-black text-slate-500">
                                                <span>{parseInt(t.viewCount).toLocaleString()} VIEWS</span>
                                                <span className="text-slate-700">|</span>
                                                <span>{new Date(t.publishedAt).getFullYear()}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-64 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-500 italic p-8 text-center text-sm">
                                        Trending data will populate based on your research query
                                    </div>
                                )}
                            </div>

                            {/* Pro Tip */}
                            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 p-6 rounded-3xl">
                                <h4 className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-2">Researcher Pro Tip</h4>
                                <p className="text-xs text-slate-400 leading-relaxed italic">
                                    "Hybrid topics that combine high Educational Depth with Mystery Suggested Formats often see 4.5x higher retention in sleep documentary audiences."
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
