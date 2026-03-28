'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    Image as ImageIcon, 
    Film, 
    Filter,
    Layers,
    X,
    Plus,
    GripVertical
} from 'lucide-react';
import { Script, VisualCue } from '@/types';

interface MediaBinPanelProps {
    script: Script;
    onAddClip: (cue: VisualCue, trackId: string) => void;
    onClose?: () => void;
}

export const MediaBinPanel: React.FC<MediaBinPanelProps> = ({ 
    script, 
    onAddClip,
    onClose 
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');

    // Extract all unique assets from the script
    const allAssets = useMemo(() => {
        const assets: VisualCue[] = [];
        const seenUrls = new Set<string>();

        script.sections.forEach(section => {
            section.visualCues?.forEach(cue => {
                if (cue.url && !seenUrls.has(cue.url)) {
                    assets.push(cue);
                    seenUrls.add(cue.url);
                }
            });
        });

        return assets;
    }, [script]);

    const filteredAssets = useMemo(() => {
        return allAssets.filter(asset => {
            const matchesSearch = asset.description?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterType === 'all' || asset.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [allAssets, searchQuery, filterType]);

    return (
        <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-80 h-full bg-slate-900 border-l border-white/5 flex flex-col shadow-[-8px_0_32px_rgba(0,0,0,0.5)] z-40"
        >
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                            <Layers size={14} className="text-indigo-400" />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Media Bin</h3>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Search & Filter */}
                <div className="space-y-3">
                    <div className="relative">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input 
                            type="text"
                            placeholder="Search assets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
                        />
                    </div>
                    <div className="flex bg-slate-950/50 p-1 rounded-xl border border-white/5">
                        {(['all', 'image', 'video'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === type ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/10' : 'text-slate-500 hover:text-white'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
                <div className="grid grid-cols-2 gap-3">
                    <AnimatePresence mode="popLayout">
                        {filteredAssets.map((asset) => (
                            <motion.div
                                key={asset.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="aspect-square"
                            >
                                <div 
                                    className="group relative w-full h-full rounded-2xl overflow-hidden bg-slate-950 border border-white/5 hover:border-indigo-500/50 transition-all cursor-grab active:cursor-grabbing shadow-lg"
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('cue', JSON.stringify(asset));
                                        e.dataTransfer.effectAllowed = 'copy';
                                    }}
                                >
                                    <img 
                                        src={asset.url} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                        alt=""
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none">
                                        <p className="text-[8px] text-white font-medium line-clamp-2 leading-tight">
                                            {asset.description || 'Global Asset'}
                                        </p>
                                    </div>
                                    <div className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 shadow-lg z-10">
                                        <Plus 
                                            size={12} 
                                            className="text-white cursor-pointer hover:scale-125 hover:text-indigo-400 transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddClip(asset, 'video');
                                            }}
                                        />
                                    </div>
                                    {asset.type === 'video' && (
                                        <div className="absolute top-2 left-2 p-1 bg-indigo-500 rounded-md shadow-lg z-10">
                                            <Film size={8} className="text-white" />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {filteredAssets.length === 0 && (
                    <div className="h-64 flex flex-col items-center justify-center text-center p-6 grayscale opacity-50">
                        <Filter size={32} className="text-slate-700 mb-4" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No assets found</p>
                        <p className="text-[10px] text-slate-500 mt-2 italic">Try a different filter or search term</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950/50 border-t border-white/5">
                <p className="text-[10px] text-slate-400 font-medium">
                    {filteredAssets.length} total assets available
                </p>
            </div>
        </motion.div>
    );
};
