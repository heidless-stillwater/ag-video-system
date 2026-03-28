'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { X, Search, Image as ImageIcon, Globe, Zap, Check, Play, Film, Sparkles, AlertCircle, LayoutGrid, List, Grid3X3, Folder, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PTImage {
    id: string;
    userId: string;
    prompt: string;
    imageUrl?: string;
    videoUrl?: string;
    duration?: number;
    settings: {
        modality: 'image' | 'video';
        quality: 'standard' | 'high' | 'ultra' | 'video';
        aspectRatio: '1:1' | '4:3' | '16:9' | '9:16' | '3:4';
        [key: string]: any;
    };
    targetSetId?: string;
    targetSetName?: string;
    promptSetID?: string;
    promptSetName?: string;
    createdAt: any;
}

interface PromptToolMediaPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (image: PTImage) => void;
    currentSelectionId?: string;
    title?: string;
    subtitle?: string;
    targetSetId?: string;
    targetSetName?: string;
}

type TabType = 'my-images' | 'community';

export function PromptToolMediaPicker({
    isOpen,
    onClose,
    onSelect,
    currentSelectionId,
    title = 'PromptTool Library',
    subtitle = 'Select media from your PromptTool account or the community',
    targetSetId,
    targetSetName
}: PromptToolMediaPickerProps) {
    const { authFetch, firebaseUser } = useAuth();
    
    const [activeTab, setActiveTab] = useState<TabType>('my-images');
    const [viewType, setViewType] = useState<'grid-sm' | 'grid-lg' | 'list'>('grid-lg');
    const [images, setImages] = useState<PTImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<PTImage | null>(null);
    const [isCloning, setIsCloning] = useState(false);
    
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Load data when tab changes or modal opens
    useEffect(() => {
        if (!isOpen) return;
        
        const fetchMedia = async () => {
            if (!firebaseUser) return;
            
            setLoading(true);
            setError(null);
            
            try {
                let url = '/api/prompttool/images?limit=40';
                
                if (activeTab === 'my-images') {
                    url += `&userId=${firebaseUser.uid}`;
                } else if (activeTab === 'community') {
                    url += '&mode=community';
                }
                
                const res = await authFetch(url);
                const data = await res.json();
                
                if (!res.ok || !data.success) {
                    throw new Error(data.error || 'Failed to fetch media');
                }
                
                setImages(data.data || []);
                // Auto-select first image if nothing is selected
                if (data.data && data.data.length > 0 && !selectedImage) {
                    setSelectedImage(data.data[0]);
                }
            } catch (err: any) {
                console.error('[PromptToolMediaPicker] Fetch Error:', err);
                setError(err.message || 'An error occurred while loading media.');
                setImages([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMedia();
    }, [isOpen, activeTab, firebaseUser, authFetch]);

    // Handle pre-selection
    useEffect(() => {
        if (isOpen && currentSelectionId && images.length > 0) {
            const found = images.find(img => img.id === currentSelectionId);
            if (found) setSelectedImage(found);
        } else if (!isOpen) {
            setSelectedImage(null);
        }
    }, [isOpen, currentSelectionId, images]);

    // Group images by promptSetID (primary from bridge) or targetSetId (fallback)
    const projectGroups = images.reduce((acc, img) => {
        const setId = img.promptSetID || img.targetSetId || 'unsorted';
        const setName = img.promptSetName || img.targetSetName || 'General Library';
        if (!acc[setId]) acc[setId] = { name: setName, images: [] };
        acc[setId].images.push(img);
        return acc;
    }, {} as Record<string, { name: string, images: PTImage[] }>);

    const sortedGroupIds = Object.keys(projectGroups).sort((a, b) => {
        if (a === 'unsorted' || a === 'General Library') return 1;
        if (b === 'unsorted' || b === 'General Library') return -1;
        return projectGroups[a].name.localeCompare(projectGroups[b].name);
    });

    if (!mounted) return null;

    const handleConfirm = async () => {
        if (selectedImage) {
            // IF we have a target project set, CLONE IT THERE FIRST
            if (targetSetId && targetSetName) {
                setIsCloning(true);
                try {
                    console.log(`[PT Picker] Cloning ${selectedImage.id} to set: ${targetSetName} (${targetSetId})`);
                    const res = await authFetch(`/api/prompttool/images/${selectedImage.id}/clone`, {
                        method: 'POST',
                        body: JSON.stringify({ targetSetId, targetSetName })
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) {
                        console.warn('[PT Picker] Cloning failed:', data.error);
                        // Carry on regardless, as selection still works for VideoSystem
                    } else {
                        console.log('[PT Picker] Clone created:', data.data);
                    }
                } catch (err) {
                    console.warn('[PT Picker] Error while cloning:', err);
                } finally {
                    setIsCloning(false);
                }
            }

            onSelect(selectedImage);
            onClose();
        }
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 md:p-10">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
                    onClick={onClose}
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.3, type: 'spring', bounce: 0 }}
                    className="relative w-full max-w-6xl h-full max-h-[85vh] bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-transparent">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Sparkles className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
                                    <span className="px-2 py-0.5 bg-indigo-500 text-[10px] font-black uppercase tracking-widest text-white rounded-md shadow-lg shadow-indigo-500/30">BETA V2</span>
                                </div>
                                <p className="text-sm text-slate-400 mt-1 font-medium">{subtitle}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <AnimatePresence mode="wait">
                                {selectedImage && (
                                    <motion.button
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        onClick={handleConfirm}
                                        className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-indigo-500/30 border border-indigo-400/50 disabled:opacity-50 disabled:hover:scale-100"
                                        disabled={isCloning}
                                    >
                                        {isCloning ? (
                                            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Zap className="w-3.5 h-3.5 fill-current" />
                                        )}
                                        {isCloning ? 'Cloning to Project...' : 'Apply Selection'}
                                    </motion.button>
                                )}
                            </AnimatePresence>
                            <button 
                                onClick={onClose} 
                                className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all group"
                            >
                                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="px-8 pt-4 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex gap-6">
                            <button
                                onClick={() => setActiveTab('my-images')}
                                className={`pb-4 px-2 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'my-images' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <ImageIcon className="w-4 h-4" />
                                My Media
                                {activeTab === 'my-images' && (
                                    <motion.div layoutId="activetab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full shadow-[0_-2px_10px_rgba(99,102,241,0.5)]" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('community')}
                                className={`pb-4 px-2 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'community' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Globe className="w-4 h-4" />
                                Community Highlights
                                {activeTab === 'community' && (
                                    <motion.div layoutId="activetab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full shadow-[0_-2px_10px_rgba(99,102,241,0.5)]" />
                                )}
                            </button>
                        </div>

                        <div className="flex items-center gap-1 pb-4">
                            <button 
                                onClick={() => setViewType('grid-sm')} 
                                className={`p-2 rounded-lg transition-all ${viewType === 'grid-sm' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                                title="Small Grid"
                            >
                                <Grid3X3 className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setViewType('grid-lg')} 
                                className={`p-2 rounded-lg transition-all ${viewType === 'grid-lg' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                                title="Large Grid"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setViewType('list')} 
                                className={`p-2 rounded-lg transition-all ${viewType === 'list' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                                title="List View"
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 bg-slate-900/50 relative no-scrollbar">
                        {loading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-900/50 backdrop-blur-sm">
                                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                                <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Library...</p>
                            </div>
                        ) : error ? (
                            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
                                    <AlertCircle className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Failed to load media</h3>
                                <p className="text-slate-400 text-sm mb-6">{error}</p>
                                <button 
                                    onClick={() => setActiveTab(activeTab)} 
                                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : images.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                                <div className="w-20 h-20 rounded-3xl bg-slate-800/50 text-slate-500 flex items-center justify-center mb-6">
                                    {activeTab === 'my-images' ? <ImageIcon className="w-10 h-10" /> : <Globe className="w-10 h-10" />}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">No media found</h3>
                                <p className="text-slate-400 text-sm">
                                    {activeTab === 'my-images' 
                                        ? "You haven't generated any images in PromptTool yet, or they haven't synced." 
                                        : "No community highlights available at the moment."}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {viewType.startsWith('grid') ? (
                                    <div className="space-y-10">
                                        {sortedGroupIds.map(groupId => (
                                            <div key={groupId} className="space-y-4">
                                                <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
                                                    <Folder className="w-4 h-4 text-indigo-400" />
                                                    <h4 className="text-sm font-black text-white uppercase tracking-widest">{projectGroups[groupId].name}</h4>
                                                    <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-mono">{projectGroups[groupId].images.length} items</span>
                                                </div>
                                                <div className={`grid ${viewType === 'grid-sm' ? 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'}`}>
                                                    {projectGroups[groupId].images.map((img) => (
                                                        <button
                                                            key={img.id}
                                                            onClick={() => setSelectedImage(img)}
                                                            onDoubleClick={() => {
                                                                setSelectedImage(img);
                                                                onSelect(img);
                                                                onClose();
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                const video = e.currentTarget.querySelector('video');
                                                                if (video) {
                                                                    video.play().catch(err => {
                                                                        // Silent fail for non-interacted play
                                                                    });
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                const video = e.currentTarget.querySelector('video');
                                                                if (video) {
                                                                    video.pause();
                                                                    video.currentTime = 0;
                                                                }
                                                            }}
                                                            className={`
                                                                group relative aspect-square rounded-2xl overflow-hidden bg-slate-800 transition-all duration-300 text-left w-full
                                                                ${selectedImage?.id === img.id ? 'ring-4 ring-indigo-500 ring-offset-4 ring-offset-slate-900 scale-[0.98]' : 'hover:ring-2 hover:ring-slate-500 hover:ring-offset-2 hover:ring-offset-slate-900 hover:scale-[1.02]'}
                                                            `}
                                                        >
                                                            {img.settings.modality === 'video' ? (
                                                                <video 
                                                                    src={img.videoUrl || img.imageUrl} 
                                                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                                    muted
                                                                    loop
                                                                    preload="metadata"
                                                                    playsInline
                                                                />
                                                            ) : (
                                                                <img 
                                                                    src={img.imageUrl} 
                                                                    alt={img.prompt} 
                                                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                                    loading="lazy"
                                                                />
                                                            )}
                                                            
                                                            {/* Overlay */}
                                                            <div className={`
                                                                absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/20 to-transparent flex flex-col justify-end p-4 transition-opacity duration-300 z-10
                                                                ${selectedImage?.id === img.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                                            `}>
                                                                <p className="text-white text-xs font-medium line-clamp-3 leading-snug drop-shadow-md">
                                                                    {img.prompt}
                                                                </p>
                                                                
                                                                <div className="flex items-center justify-between gap-2 mt-3 text-[10px] font-bold uppercase tracking-wider">
                                                                    {img.settings.modality === 'video' ? (
                                                                        <span className="flex items-center gap-1 bg-purple-500/20 text-purple-300 px-2 py-1 rounded backdrop-blur-md">
                                                                            <Film className="w-3 h-3" /> VIDEO
                                                                        </span>
                                                                    ) : (
                                                                        <span className="flex items-center gap-1 bg-slate-800/80 text-white/70 px-2 py-1 rounded backdrop-blur-md">
                                                                            <ImageIcon className="w-3 h-3" /> {img.settings.aspectRatio}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Selection Checkmark */}
                                                            {selectedImage?.id === img.id && (
                                                                <div className="absolute top-3 right-3 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg transform scale-100 transition-transform z-20">
                                                                    <Check className="w-5 h-5 text-white" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-10">
                                        {sortedGroupIds.map(groupId => (
                                            <div key={groupId} className="space-y-4">
                                                <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
                                                    <Folder className="w-4 h-4 text-indigo-400" />
                                                    <h4 className="text-sm font-black text-white uppercase tracking-widest">{projectGroups[groupId].name}</h4>
                                                    <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-mono">{projectGroups[groupId].images.length} items</span>
                                                </div>
                                                <div className="flex flex-col gap-3">
                                                    {projectGroups[groupId].images.map((img) => (
                                                        <button
                                                            key={img.id}
                                                            onClick={() => setSelectedImage(img)}
                                                            onMouseEnter={(e) => {
                                                                const video = e.currentTarget.querySelector('video');
                                                                if (video) video.play().catch(err => console.warn('Hover play failed:', err));
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                const video = e.currentTarget.querySelector('video');
                                                                if (video) {
                                                                    video.pause();
                                                                    video.currentTime = 0;
                                                                }
                                                            }}
                                                            className={`
                                                                group flex items-center gap-4 p-3 rounded-2xl transition-all text-left
                                                                ${selectedImage?.id === img.id ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-800/30 hover:bg-slate-800/50 border-transparent'}
                                                                border
                                                            `}
                                                        >
                                                            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                                                                {img.settings.modality === 'video' ? (
                                                                    <video 
                                                                        src={img.videoUrl || img.imageUrl} 
                                                                        className="absolute inset-0 w-full h-full object-cover"
                                                                        muted
                                                                        loop
                                                                        preload="metadata"
                                                                        playsInline
                                                                    />
                                                                ) : (
                                                                    <img src={img.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0 pr-4">
                                                                <div className="flex items-center gap-3 mb-1">
                                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${img.settings.modality === 'video' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>
                                                                        {img.settings.modality === 'video' ? 'Video' : 'Image'}
                                                                    </span>
                                                                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                                                                        {img.settings.aspectRatio} • {img.settings.quality}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
                                                                    {img.prompt}
                                                                </p>
                                                                <p className="text-[10px] text-slate-500 mt-1">
                                                                    Created {new Date(img.createdAt?.seconds * 1000).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                            {selectedImage?.id === img.id && (
                                                                <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shrink-0">
                                                                    <Check className="w-4 h-4 text-white" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer / Actions */}
                    <div className="px-8 py-5 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
                        <div className="flex-1">
                            {selectedImage ? (
                                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-700">
                                        <img src={selectedImage.imageUrl} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white font-bold text-sm truncate">{selectedImage.prompt}</p>
                                        <p className="text-slate-400 text-xs truncate">
                                            {selectedImage.settings.aspectRatio} • {selectedImage.settings.quality} quality
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-500 text-sm font-medium">No media selected</p>
                            )}
                        </div>
                        
                        <div className="flex gap-4 ml-6 shrink-0">
                            <button 
                                onClick={onClose}
                                className="px-8 py-3 rounded-xl font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all border border-slate-700/50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}
