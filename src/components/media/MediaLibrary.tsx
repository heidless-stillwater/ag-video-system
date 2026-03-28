'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Image as ImageIcon, 
    Film, 
    Search, 
    Filter, 
    Grid2X2, 
    List, 
    Star, 
    Trash2, 
    Download, 
    ExternalLink, 
    MoreVertical,
    Clock,
    Tag,
    Share2,
    RefreshCw,
    X,
    CheckCircle2,
    Check
} from 'lucide-react';
import { MediaLibraryEntry } from '@/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { mediaLibraryService } from '@/lib/services/media-library';

export const MediaLibrary: React.FC = () => {
    const { user, authFetch } = useAuth();
    const [entries, setEntries] = useState<MediaLibraryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my-library' | 'community'>('my-library');
    const [filterType, setFilterType] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedEntry, setSelectedEntry] = useState<MediaLibraryEntry | null>(null);

    useEffect(() => {
        if (user) {
            fetchEntries();
        }
    }, [user, filterType, activeTab]);

    const fetchEntries = async () => {
        setLoading(true);
        try {
            const url = activeTab === 'my-library' 
                ? `/api/media-library?type=${filterType === 'all' ? '' : filterType}`
                : `/api/media-library?includePromptTool=true&type=${filterType === 'all' ? '' : filterType}&mode=community`;
            
            const res = await authFetch(url);
            
            if (!res.ok) {
                const text = await res.text();
                console.error(`Media Library API Error (${res.status}):`, text);
                return;
            }

            const data = await res.json();
            if (data.success) {
                setEntries(data.data);
            }
        } catch (err) {
            console.error('Failed to parse media library response:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFavorite = async (entry: MediaLibraryEntry) => {
        try {
            const res = await authFetch(`/api/media-library/${entry.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFavorite: !entry.isFavorite })
            });

            if (res.ok) {
                setEntries(prev => prev.map(e => 
                    e.id === entry.id ? { ...e, isFavorite: !e.isFavorite } : e
                ));
            }
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        }
    };

    const deleteEntry = async (entry: MediaLibraryEntry) => {
        if (!window.confirm('Are you sure you want to remove this from your library?')) return;
        
        try {
            const res = await authFetch(`/api/media-library/${entry.id}`, { method: 'DELETE' });
            if (res.ok) {
                setEntries(prev => prev.filter(e => e.id !== entry.id));
                if (selectedEntry?.id === entry.id) setSelectedEntry(null);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete');
            }
        } catch (err) {
            console.error('Failed to delete entry:', err);
        }
    };

    const importEntry = async (entry: MediaLibraryEntry) => {
        if (!entry.metadata?.ptOriginId) return;
        
        setLoading(true);
        try {
            const res = await authFetch('/api/media-library/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ptImageId: entry.metadata.ptOriginId })
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    // Update entries to mark it as imported locally or refresh
                    alert('Successfully imported to your library!');
                    fetchEntries();
                    setSelectedEntry(null);
                }
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to import');
            }
        } catch (err) {
            console.error('Failed to import entry:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredEntries = entries.filter(e => 
        e.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
            {/* Header / Toolbar */}
            <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent leading-tight">
                                Media Library
                            </h1>
                            <p className="text-sm text-slate-400 font-medium">Manage and reuse your generated assets</p>
                        </div>

                        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-end mb-1">
                            <button 
                                onClick={() => setActiveTab('my-library')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'my-library' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                My Assets
                            </button>
                            <button 
                                onClick={() => setActiveTab('community')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'community' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Community
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input 
                                type="text"
                                placeholder="Search prompts or tags..."
                                className="bg-slate-800 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 w-64 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        <button 
                            onClick={() => fetchEntries()}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="border-b border-slate-800 bg-slate-900/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {['all', 'image', 'video'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                    filterType === type 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                {type.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-700 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Grid2X2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-700 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full min-h-[50vh]">
                    {loading && entries.length === 0 ? (
                        <div className="h-full flex items-center justify-center min-h-[40vh]">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                                <p className="text-slate-500 font-medium">Loading your assets...</p>
                            </div>
                        </div>
                    ) : filteredEntries.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-center min-h-[40vh]">
                            <div className="max-w-md p-8 rounded-2xl border border-dashed border-slate-800">
                                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <ImageIcon className="w-8 h-8 text-slate-700" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-200 mb-2">No assets found</h3>
                                <p className="text-slate-500">
                                    {searchQuery ? "Try adjusting your search terms" : "Start generating content to see it here!"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <motion.div 
                            layout
                            className={viewMode === 'grid' 
                                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" 
                                : "flex flex-col gap-3"
                            }
                        >
                            <AnimatePresence mode="popLayout">
                                {filteredEntries.map((entry) => (
                                    <MediaItem 
                                        key={entry.id} 
                                        entry={entry} 
                                        viewMode={viewMode}
                                        onSelect={() => setSelectedEntry(entry)}
                                        onToggleFavorite={() => toggleFavorite(entry)}
                                        onDelete={() => deleteEntry(entry)}
                                    />
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Entry Detail Drawer */}
            <AnimatePresence>
                {selectedEntry && (
                    <EntryDetails 
                        entry={selectedEntry} 
                        onClose={() => setSelectedEntry(null)}
                        onToggleFavorite={() => toggleFavorite(selectedEntry)}
                        onDelete={() => deleteEntry(selectedEntry)}
                        onImport={() => importEntry(selectedEntry)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

interface MediaItemProps {
    entry: MediaLibraryEntry;
    viewMode: 'grid' | 'list';
    onSelect: () => void;
    onToggleFavorite: () => void;
    onDelete: () => void;
}

const MediaItem: React.FC<MediaItemProps> = ({ entry, viewMode, onSelect, onToggleFavorite, onDelete }) => {
    const isPT = entry.source === 'prompt-tool';
    const isVideo = entry.type === 'video' && (entry.url.endsWith('.mp4') || entry.metadata?.videoUrl);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [isHovered, setIsHovered] = React.useState(false);

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (videoRef.current) {
            videoRef.current.play().catch(() => {});
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };

    if (viewMode === 'list') {
        return (
            <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group flex items-center gap-4 p-3 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/50 rounded-xl transition-all cursor-pointer"
                onClick={onSelect}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800">
                    {isVideo ? (
                        <video 
                            ref={videoRef}
                            src={entry.url}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            className={`w-full h-full object-cover transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-100'}`}
                        />
                    ) : (
                        <img 
                            src={entry.thumbnailUrl || entry.url} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            alt={entry.prompt || 'Media asset'}
                        />
                    )}
                    {isPT && (
                        <div className="absolute top-1 left-1 bg-purple-600 text-[10px] px-1.5 py-0.5 rounded-md font-bold text-white shadow-lg z-10">
                            PT
                        </div>
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                            {entry.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                            {entry.type}
                        </span>
                        <span className="text-[10px] text-slate-600">•</span>
                        <span className="text-xs text-slate-500 uppercase font-bold tracking-tighter">
                            {entry.source}
                        </span>
                    </div>
                    <p className="text-sm text-slate-200 font-medium truncate max-w-xl">
                        {entry.prompt || 'No prompt info'}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                        className={`p-2 rounded-full hover:bg-slate-700 transition-colors ${entry.isFavorite ? 'text-amber-400' : 'text-slate-500'}`}
                    >
                        <Star className={`w-4 h-4 ${entry.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -4 }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="group relative flex flex-col bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden cursor-pointer hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300"
            onClick={onSelect}
        >
            {/* Image Container */}
            <div className="aspect-[4/5] overflow-hidden bg-slate-800 relative">
                {isVideo ? (
                    <video 
                        ref={videoRef}
                        src={entry.url}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700 ease-out"
                    />
                ) : (
                    <img 
                        src={entry.thumbnailUrl || entry.url} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        alt={entry.prompt || 'Media asset'}
                        loading="lazy"
                    />
                )}
                
                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                
                {entry.isFavorite && (
                    <div className="absolute top-3 right-3 text-amber-400 drop-shadow-lg z-10">
                        <Star className="w-5 h-5 fill-current" />
                    </div>
                )}

                {isPT && (
                    <div className="absolute top-3 left-3 bg-purple-600/90 backdrop-blur-md text-[10px] px-2 py-0.5 rounded-lg font-black text-white shadow-xl flex items-center gap-1 uppercase tracking-tight z-10">
                        PromptTool
                    </div>
                )}

                {/* Video Indicator */}
                {isVideo && !isHovered && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-slate-900/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white">
                            <Film className="w-6 h-6" />
                        </div>
                    </div>
                )}

                <div className="absolute bottom-3 left-3 right-3 z-10">
                    <div className="flex items-center gap-2 mb-1.5">
                         <span className="text-[9px] font-bold text-slate-400 px-1.5 py-0.5 bg-slate-900/60 backdrop-blur-md rounded border border-slate-700 uppercase tracking-tighter">
                            {entry.type}
                        </span>
                        {entry.metadata?.aspectRatio && (
                            <span className="text-[9px] font-bold text-slate-400 px-1.5 py-0.5 bg-slate-900/60 backdrop-blur-md rounded border border-slate-700">
                                {entry.metadata.aspectRatio}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-100 line-clamp-2 leading-relaxed opacity-90">
                        {entry.prompt}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

const EntryDetails: React.FC<{ 
    entry: MediaLibraryEntry, 
    onClose: () => void,
    onToggleFavorite: () => void,
    onDelete: () => void,
    onImport: () => void
}> = ({ entry, onClose, onToggleFavorite, onDelete, onImport }) => {
    const isPT = entry.source === 'prompt-tool';
    const isVideo = entry.type === 'video' && (entry.url.endsWith('.mp4') || entry.metadata?.videoUrl);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[85vh] flex overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Preview Section */}
                <div className="flex-[3] bg-black flex items-center justify-center relative group">
                    {isVideo ? (
                        <video 
                            src={entry.url}
                            controls
                            autoPlay
                            loop
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : (
                        <img 
                            src={entry.url} 
                            className="max-w-full max-h-full object-contain"
                            alt={entry.prompt}
                        />
                    )}
                    
                    <button 
                        onClick={onClose}
                        className="absolute top-4 left-4 p-2 bg-slate-900/50 hover:bg-slate-900 rounded-full text-white transition-colors border border-slate-700"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="absolute bottom-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                            href={entry.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition-colors shadow-xl"
                        >
                            <Download className="w-4 h-4" /> Download Original
                        </a>
                    </div>
                </div>

                {/* Sidebar Section */}
                <div className="flex-[1.5] flex flex-col border-l border-slate-800 bg-slate-900">
                    <div className="p-8 flex-1 overflow-y-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPT ? 'bg-purple-600 shadow-lg shadow-purple-900/20' : 'bg-blue-600 shadow-lg shadow-blue-900/20'}`}>
                                    {isPT ? <ExternalLink className="w-5 h-5 text-white" /> : <ImageIcon className="w-5 h-5 text-white" />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white leading-tight">Asset Details</h2>
                                    <p className="text-xs text-slate-500 uppercase font-black tracking-widest">{entry.source}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <section>
                                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-2">
                                    <Clock className="w-3 h-3" /> Description / Prompt
                                </h3>
                                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-sm text-slate-300 leading-relaxed italic">
                                    "{entry.prompt}"
                                </div>
                            </section>

                            <div className="grid grid-cols-2 gap-4">
                                <section className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-widest">Type</h3>
                                    <p className="text-sm font-bold text-slate-200 uppercase">{entry.type}</p>
                                </section>
                                <section className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-widest">Ratio</h3>
                                    <p className="text-sm font-bold text-slate-200 uppercase">{entry.metadata?.aspectRatio || 'N/A'}</p>
                                </section>
                            </div>

                            {entry.tags && entry.tags.length > 0 && (
                                <section>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest">Tags</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {entry.tags.map(tag => (
                                            <span key={tag} className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-medium border border-slate-700">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}
                            
                            {isPT && entry.metadata?.ptOriginId && (
                                <section className="p-4 bg-purple-950/20 rounded-2xl border border-purple-500/20">
                                    <h3 className="text-[10px] font-bold text-purple-400 uppercase mb-1 tracking-widest">PromptTool ID</h3>
                                    <p className="text-[10px] font-mono text-purple-300/60 select-all">{entry.metadata.ptOriginId}</p>
                                </section>
                            )}
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-8 pt-4 border-t border-slate-800 flex items-center gap-3">
                        {isPT && (
                             <button 
                                onClick={(e) => { e.stopPropagation(); entry.id.startsWith('pt-') ? onImport() : null; }}
                                disabled={!entry.id.startsWith('pt-')}
                                className={`flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl font-bold text-sm transition-all border ${
                                    entry.id.startsWith('pt-')
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xl shadow-purple-900/20 border-purple-500/50'
                                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 cursor-default'
                                }`}
                             >
                                {entry.id.startsWith('pt-') ? <><Download className="w-4 h-4" /> Import to Library</> : <><Check className="w-4 h-4" /> In Library</>}
                             </button>
                        )}

                        {!isPT && (
                             <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all"
                                title="Delete Asset"
                             >
                                <Trash2 className="w-5 h-5" />
                             </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
