'use client';

import React from 'react';
import { VisualStyle } from '@/types';

interface StyleOption {
    id: VisualStyle;
    title: string;
    description: string;
    icon: string;
    color: string;
}

const styles: StyleOption[] = [
    {
        id: 'cinematic',
        title: 'Cinematic',
        description: 'Large scale, photorealistic, and atmospheric. Perfect for epic nature docs.',
        icon: '🎬',
        color: 'from-blue-600/20 to-indigo-600/20',
    },
    {
        id: 'national-geographic',
        title: 'National Geographic',
        description: 'Tack-sharp wildlife and nature photography. Authentic and educational.',
        icon: '🌍',
        color: 'from-yellow-600/20 to-orange-600/20',
    },
    {
        id: 'studio-ghibli',
        title: 'Studio Ghibli',
        description: 'Hand-painted, whimsical, and soft. Extremely soothing and dream-like.',
        icon: '🚂',
        color: 'from-emerald-600/20 to-green-600/20',
    },
    {
        id: 'oil-painting',
        title: 'Oil Painting',
        description: 'Rich textures and classic brushstrokes. Timeless and artistic.',
        icon: '🎨',
        color: 'from-amber-600/20 to-red-600/20',
    },
    {
        id: 'anime',
        title: 'High-End Anime',
        description: 'Vibrant colors and expressive lighting. Modern and evocative.',
        icon: '🎌',
        color: 'from-pink-600/20 to-purple-600/20',
    },
    {
        id: 'cyberpunk',
        title: 'Cyberpunk Noir',
        description: 'Neon lighting and futuristic urban rain. Deep contrast and atmosphere.',
        icon: '🌃',
        color: 'from-fuchsia-600/20 to-blue-900/40',
    },
    {
        id: 'vaporwave',
        title: 'Vaporwave',
        description: 'Pastel gradients and surreal lo-fi vibes. Nostalgic and relaxing.',
        icon: '🌴',
        color: 'from-cyan-400/20 to-pink-500/20',
    },
    {
        id: 'watercolor',
        title: 'Watercolor Strip',
        description: 'Soft edges and delicate washes. Peaceful and fluid motion.',
        icon: '💧',
        color: 'from-blue-400/20 to-teal-400/20',
    },
    {
        id: 'sketch',
        title: 'Charcoal Sketch',
        description: 'Hand-drawn textures and high contrast. Raw and intimate.',
        icon: '✏️',
        color: 'from-slate-600/20 to-slate-900/40',
    },
];

interface StyleSelectorProps {
    selectedStyle: VisualStyle;
    onStyleSelect: (style: VisualStyle) => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onStyleSelect }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {styles.map((style) => (
                <button
                    key={style.id}
                    type="button"
                    onClick={() => onStyleSelect(style.id)}
                    className={`group relative p-6 rounded-3xl border transition-all text-left flex flex-col items-start gap-3 hover:scale-[1.02] ${selectedStyle === style.id
                            ? 'bg-gradient-to-br border-white/20 ring-2 ring-blue-500 shadow-xl shadow-blue-500/20'
                            : 'bg-slate-900/50 border-white/5 hover:border-white/10'
                        } ${style.color}`}
                >
                    <div className="text-4xl mb-1 group-hover:scale-110 transition-transform duration-300">
                        {style.icon}
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                            {style.title}
                        </h4>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            {style.description}
                        </p>
                    </div>

                    {selectedStyle === style.id && (
                        <div className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
};
