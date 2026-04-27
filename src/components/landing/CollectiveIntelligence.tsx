'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { MediaLibraryEntry } from '@/types';
import { Icons } from '@/components/ui/Icons';

export function CollectiveIntelligence() {
    const [resources, setResources] = useState<MediaLibraryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadResources() {
            try {
                const res = await fetch('/api/media-library?mode=community&type=article');
                const json = await res.json();
                if (json.success) {
                    setResources(json.data.slice(0, 10));
                }
            } catch (err) {
                console.error('Failed to load community resources:', err);
            } finally {
                setIsLoading(false);
            }
        }
        loadResources();
    }, []);

    if (!isLoading && resources.length === 0) return null;

    return (
        <section className="py-24 px-6 bg-[#050505] border-t border-white/5 relative overflow-hidden">
            <div className="max-w-7xl mx-auto space-y-12 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end gap-8">
                    <div className="space-y-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Shared Intel</span>
                        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">Collective <br />Intelligence</h2>
                    </div>
                    <p className="text-slate-500 font-medium max-w-sm text-sm">
                        Behind every synthesis is a foundation of deep research. Explore the blueprints and artifacts powering the showroom.
                    </p>
                </div>

                {/* Horizontal Snap Scroll */}
                <div className="flex gap-6 overflow-x-auto pb-12 snap-x hide-scrollbar -mx-6 px-6">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="min-w-[320px] md:min-w-[420px] aspect-video rounded-3xl bg-white/[0.02] border border-white/10 animate-pulse snap-center" />
                        ))
                    ) : (
                        resources.map((item) => (
                            <div key={item.id} className="min-w-[320px] md:min-w-[420px] snap-center group">
                                <div className="aspect-video rounded-3xl bg-white/[0.02] border border-white/10 overflow-hidden relative mb-6">
                                    <Image
                                        src={item.thumbnailUrl || '/placeholders/doc-placeholder.png'}
                                        alt={item.prompt || 'Research Item'}
                                        fill
                                        className="object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                                    
                                    {/* Type Badge */}
                                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                                        <Icons.bookOpen className="w-3 h-3 text-indigo-500" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-white">Research</span>
                                    </div>
                                </div>

                                <div className="space-y-3 px-2">
                                    <h3 className="text-sm font-black uppercase tracking-tight text-white group-hover:text-indigo-400 transition-colors line-clamp-2">
                                        {item.prompt || 'Untitled Intelligence'}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                                        {item.metadata?.description || 'No summary available for this collective artifact.'}
                                    </p>
                                    <div className="flex gap-2 pt-2">
                                        <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2 group/btn">
                                            Read Artifact
                                            <Icons.arrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                        <button className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-[9px] font-black uppercase tracking-widest text-indigo-400 transition-all">
                                            Save to Library
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
