'use client';

import React, { useState, useEffect } from 'react';
import { VisualStyle } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown } from 'lucide-react';

interface StyleOption {
    id: VisualStyle;
    title: string;
    description: string;
}

const styles: StyleOption[] = [
    {
        id: 'cinematic',
        title: 'Cinematic',
        description: 'Large scale, photorealistic, and atmospheric.',
    },
    {
        id: 'national-geographic',
        title: 'National Geographic',
        description: 'Tack-sharp wildlife and nature photography.',
    },
    {
        id: 'studio-ghibli',
        title: 'Studio Ghibli',
        description: 'Hand-painted, whimsical, and soft.',
    },
    {
        id: 'oil-painting',
        title: 'Oil Painting',
        description: 'Rich textures and classic brushstrokes.',
    },
    {
        id: 'anime',
        title: 'High-End Anime',
        description: 'Vibrant colors and expressive lighting.',
    },
    {
        id: 'cyberpunk',
        title: 'Cyberpunk Noir',
        description: 'Neon lighting and futuristic urban rain.',
    },
    {
        id: 'vaporwave',
        title: 'Vaporwave',
        description: 'Pastel gradients and surreal lo-fi vibes.',
    },
    {
        id: 'watercolor',
        title: 'Watercolor Strip',
        description: 'Soft edges and delicate washes.',
    },
    {
        id: 'sketch',
        title: 'Charcoal Sketch',
        description: 'Hand-drawn textures and high contrast.',
    },
];

interface StyleSelectorProps {
    selectedStyle?: VisualStyle;
    onStyleSelect: (style: VisualStyle) => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onStyleSelect }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    useEffect(() => {
        const lastSelected = localStorage.getItem('last_selected_aesthetic') as VisualStyle;
        if (!selectedStyle && lastSelected) {
            onStyleSelect(lastSelected);
        }
    }, [selectedStyle, onStyleSelect]);

    const handleStyleSelect = (style: VisualStyle) => {
        onStyleSelect(style);
        localStorage.setItem('last_selected_aesthetic', style);
    };

    return (
        <div className="bg-slate-800/50 rounded-2xl border border-white/5 mb-8 max-w-2xl overflow-hidden group/style">
            <div 
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Visual Aesthetic</h3>
                            <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/20">
                                {styles.find(s => s.id === selectedStyle)?.title || 'Select'}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Define the cinematic personality of your documentary.</p>
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: isCollapsed ? 0 : 180 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                </motion.div>
            </div>

            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <div className="p-6 pt-0 border-t border-white/5">
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                {styles.map((style) => (
                                    <button
                                        key={style.id}
                                        onClick={() => handleStyleSelect(style.id)}
                                        className={`p-3 rounded-xl border transition-all text-left flex flex-col gap-1 ${selectedStyle === style.id
                                            ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10'
                                            : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-white leading-tight">{style.title}</span>
                                            {selectedStyle === style.id && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
                                        </div>
                                        <span className="text-[10px] text-slate-500 leading-tight">{style.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
