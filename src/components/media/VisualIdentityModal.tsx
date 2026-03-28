'use client';

import React, { useState, useEffect } from 'react';
import { X, Palette, Layout, Zap, Sparkles, Move, Film, Play, Image as ImageIcon, ChevronDown, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export interface VisualIdentityConfiguration {
    style: string;
    palette: string;
    aspectRatio: '16:9' | '9:16' | '1:1' | '21:9' | '4:3' | '3:2' | '2:3' | '9:21';
    motionIntensity: 'static' | 'subtle' | 'dynamic' | 'cinematic';
    engine: 'nanobanana-2' | 'nanobanana-pro' | 'stock-api' | 'manual-upload';
    atmosphericCues: string;
    imagesPerSection: number;
    optimizationStrategy: 'thematic' | 'even';
}

interface VisualIdentityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (config: VisualIdentityConfiguration) => void;
    onCancel?: () => void;
    isGenerating: boolean;
    progress?: number;
    statusMessage?: string;
    sectionCount?: number;
}

export const VisualIdentityModal: React.FC<VisualIdentityModalProps> = ({
    isOpen,
    onClose,
    onStart,
    onCancel,
    isGenerating,
    progress = 0,
    statusMessage,
    sectionCount = 0
}) => {
    const [config, setConfig] = useState<VisualIdentityConfiguration>({
        style: 'cinematic',
        palette: 'teal_orange',
        aspectRatio: '16:9',
        motionIntensity: 'subtle',
        engine: 'nanobanana-2',
        atmosphericCues: 'Soft morning mist, high contrast',
        imagesPerSection: 4,
        optimizationStrategy: 'thematic'
    });
    const [showConfirm, setShowConfirm] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);
    const [hintDismissed, setHintDismissed] = useState(false);
    const [expandedSections, setExpandedSections] = useState<string[]>(['granularity']);
    const contentRef = React.useRef<HTMLDivElement>(null);

    const toggleSection = (id: string) => {
        setExpandedSections(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
        // Check scroll again after transition
        setTimeout(checkScroll, 300);
    };

    const checkScroll = () => {
        if (contentRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
            setCanScrollDown(scrollTop + clientHeight < scrollHeight - 20);
            if (scrollTop > 10) setHintDismissed(true);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setHintDismissed(false);
            // Check after a short delay to allow content to render
            const timer = setTimeout(checkScroll, 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);


    const styles = [
        { id: 'cinematic', name: 'Cinematic', icon: <Film size={18} />, desc: 'High-end film look with dramatic lighting' },
        { id: 'documentary', name: 'National Geographic', icon: <ImageIcon size={18} />, desc: 'Realistic, high-clarity nature photography' },
        { id: 'minimalist', name: 'Minimalist', icon: <Layout size={18} />, desc: 'Clean, simple compositions and limited colors' },
        { id: 'noir', name: 'Noir', icon: <Palette size={18} />, desc: 'Moody, black & white with deep shadows' },
        { id: 'dreamy', name: 'Ethereal', icon: <Sparkles size={18} />, desc: 'Soft glows, pastel colors, and light leaks' },
        { id: 'techno', name: 'Techno-Organic', icon: <Zap size={18} />, desc: 'Neon highlights with organic structures' },
    ];

    const palettes = [
        { id: 'teal_orange', name: 'Teal & Orange', colors: ['#0891b2', '#f97316'] },
        { id: 'monochrome', name: 'Deep Monochrome', colors: ['#1e293b', '#64748b'] },
        { id: 'vibrant', name: 'Vibrant Solar', colors: ['#f59e0b', '#ef4444'] },
        { id: 'forest', name: 'Emerald Forest', colors: ['#065f46', '#059669'] },
        { id: 'void', name: 'Midnight Void', colors: ['#0f172a', '#334155'] },
        { id: 'sakura', name: 'Sakura Petals', colors: ['#db2777', '#fbcfe8'] },
    ];

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div key="media-modal-overlay" className="fixed inset-0 z-[400] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl"
                            onClick={onClose}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            onClickCapture={() => setHintDismissed(true)}
                            className="relative w-full max-w-4xl bg-[#090b10] border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(168,85,247,0.15)] overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/5 to-transparent">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                            <Sparkles size={20} />
                                        </div>
                                        <h2 className="text-3xl font-black text-white tracking-tight">Generate Media</h2>
                                    </div>
                                    <p className="text-purple-300/70 text-[10px] uppercase tracking-[0.3em] font-black">Use Script as Inspiration for Media</p>
                                </div>
                                <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all border border-transparent hover:border-white/5 group">
                                    <X className="w-6 h-6 text-white/30 group-hover:text-white group-hover:rotate-90 transition-all" />
                                </button>
                            </div>

                            {/* Content Wrapper */}
                            <div className="flex-1 relative overflow-hidden flex flex-col">
                                <div
                                    ref={contentRef}
                                    onScroll={checkScroll}
                                    className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain custom-scrollbar"
                                >
                                    {/* 01. Synthesis Granularity (MOVED TO TOP) */}
                                    <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden transition-all hover:border-white/10">
                                        <button
                                            onClick={() => toggleSection('granularity')}
                                            className="w-full p-5 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                                                    <Layers className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">Image Density</h3>
                                                    <p className="text-[9px] text-white/60 font-medium">{sectionCount} scenes • {config.imagesPerSection} shots/scene • Total: {sectionCount * config.imagesPerSection} Images</p>
                                                </div>
                                            </div>
                                            <ChevronDown className={`w-5 h-5 text-white/40 transition-transform duration-300 ${expandedSections.includes('granularity') ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {expandedSections.includes('granularity') && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                >
                                                    <div className="px-6 pb-6 space-y-6 border-t border-white/5 pt-6">
                                                        {/* INTEGRATED DASHBOARD & SLIDER */}
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-[#0c0f16]/60 border border-white/5 rounded-[2rem] p-6 overflow-hidden relative group/strip transition-all hover:border-purple-500/10">
                                                            <div className="absolute inset-0 bg-purple-500/5 blur-3xl opacity-20 -z-10" />

                                                            {/* Left Column: The Calculation */}
                                                            <div className="text-center lg:text-left space-y-4">
                                                                <div className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">Avg Number of Images</div>
                                                                <div className="space-y-1">
                                                                    <div className="text-6xl font-black text-white tracking-tighter tabular-nums flex items-baseline justify-center lg:justify-start gap-3">
                                                                        {sectionCount * config.imagesPerSection}
                                                                        <span className="text-xs uppercase text-white/20 tracking-widest font-black italic">Images</span>
                                                                    </div>
                                                                    <div className="text-[11px] text-white/40 font-mono tracking-widest">
                                                                        {sectionCount} SCENES × {config.imagesPerSection} PER SCENE
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Right Column: The Slider (Directly level with the result) */}
                                                            <div className="space-y-8">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="space-y-1">
                                                                        <label className="text-[11px] font-black text-white uppercase tracking-widest">Shot Density / Images per Scene</label>
                                                                        <p className="text-[9px] text-white/40 italic">Move slider to adjust output depth</p>
                                                                    </div>
                                                                </div>
                                                                <div className="relative group/slider px-2">
                                                                    <input
                                                                        type="range"
                                                                        min="1"
                                                                        max="10"
                                                                        step="1"
                                                                        value={config.imagesPerSection}
                                                                        onChange={(e) => setConfig({ ...config, imagesPerSection: parseInt(e.target.value) })}
                                                                        className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-purple-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                                                                    />
                                                                    <div className="flex justify-between mt-4 px-1 text-[9px] font-black text-white/20 uppercase tracking-widest">
                                                                        <span className={config.imagesPerSection === 1 ? 'text-purple-400' : ''}>Minimal</span>
                                                                        <span className={config.imagesPerSection === 4 ? 'text-purple-400' : ''}>Standard (4)</span>
                                                                        <span className={config.imagesPerSection === 10 ? 'text-purple-400' : ''}>Max</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Optimization Strategy Area */}
                                                        <div className="space-y-6 pt-2">
                                                            <label className="text-[11px] font-black text-white uppercase tracking-widest block">Optimization Strategy</label>
                                                            <div className="flex flex-wrap gap-4">
                                                                {(['thematic', 'even'] as const).map((strat) => (
                                                                    <button
                                                                        key={strat}
                                                                        onClick={() => setConfig({ ...config, optimizationStrategy: strat })}
                                                                        className={`
                                                                    flex-1 py-5 px-8 rounded-[2rem] text-[11px] font-black border uppercase tracking-widest transition-all text-center
                                                                    ${config.optimizationStrategy === strat
                                                                                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-[0_8px_20px_rgba(168,85,247,0.1)]'
                                                                                : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/20 hover:text-white'}
                                                                `}
                                                                    >
                                                                        {strat}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <p className="text-[10px] text-white/40 italic leading-relaxed px-2">
                                                                {config.optimizationStrategy === 'thematic'
                                                                    ? 'AI detects key emotional and narrative shifts for asset placement.'
                                                                    : 'Assets are distributed with mathematical precision across the duration.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </section>

                                    {/* 02. Engine Selection */}
                                    <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden transition-all hover:border-white/10">
                                        <button
                                            onClick={() => toggleSection('engine')}
                                            className="w-full p-5 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500 group-hover:scale-110 transition-transform">
                                                    <Zap className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">Synthesis Engine</h3>
                                                    <p className="text-[9px] text-white/60 font-medium">Core Intelligence: {config.engine.replace('-', ' ')}</p>
                                                </div>
                                            </div>
                                            <ChevronDown className={`w-5 h-5 text-white/40 transition-transform duration-300 ${expandedSections.includes('engine') ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {expandedSections.includes('engine') && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                >
                                                    <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-6">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                            {[
                                                                { id: 'nanobanana-2', name: 'Nanobanana 2', icon: '🍌', desc: 'Fast generation (Imagen 3.0)' },
                                                                { id: 'nanobanana-pro', name: 'Nanobanana Pro', icon: '💎', desc: 'Ultra-high photorealistic precision' },
                                                                { id: 'stock-api', name: 'Image Resources API', icon: '🖼️', desc: 'Curated stock library' },
                                                                { id: 'manual-upload', name: 'Asset Upload', icon: '📤', desc: 'Submit custom assets' },
                                                            ].map((engine) => (
                                                                <button
                                                                    key={engine.id}
                                                                    onClick={() => setConfig({ ...config, engine: engine.id as any })}
                                                                    className={`
                                                                p-5 rounded-[2rem] border transition-all text-left flex flex-col gap-2 group relative overflow-hidden
                                                                ${config.engine === engine.id
                                                                            ? 'bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.1)]'
                                                                            : 'bg-white/[0.02] border-white/5 hover:border-white/20'}
                                                            `}
                                                                >
                                                                    <div className="text-[11px] font-black uppercase tracking-wider mb-2">{engine.name}</div>
                                                                    <div className="text-[9px] text-slate-400 font-medium leading-tight">{engine.desc}</div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </section>

                                    {/* 03. Style Selection */}
                                    <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden transition-all hover:border-white/10">
                                        <button
                                            onClick={() => toggleSection('style')}
                                            className="w-full p-5 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                                                    <Layout className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">Cinematic Style Profile</h3>
                                                    <p className="text-[9px] text-white/60 font-medium">Visual DNA: {config.style}</p>
                                                </div>
                                            </div>
                                            <ChevronDown className={`w-5 h-5 text-white/40 transition-transform duration-300 ${expandedSections.includes('style') ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {expandedSections.includes('style') && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                >
                                                    <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-6">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {styles.map((s) => (
                                                                <button
                                                                    key={s.id}
                                                                    onClick={() => setConfig({ ...config, style: s.id })}
                                                                    className={`
                                                                p-5 rounded-[2rem] border transition-all text-left flex flex-col gap-3 group
                                                                ${config.style === s.id
                                                                            ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.1)]'
                                                                            : 'bg-white/[0.02] border-white/5 hover:border-white/20'}
                                                            `}
                                                                >
                                                                    <div className={`text-sm font-black ${config.style === s.id ? 'text-white' : 'text-slate-400'}`}>{s.name}</div>
                                                                    <div className="text-[10px] text-slate-400 font-medium leading-relaxed">{s.desc}</div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </section>

                                    {/* 04. Palette & Motion */}
                                    <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden transition-all hover:border-white/10">
                                        <button
                                            onClick={() => toggleSection('palette')}
                                            className="w-full p-8 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                                                    <Palette className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">Atmospheric Palette & Motion</h3>
                                                    <p className="text-[9px] text-white/60 font-medium">Palette: {config.palette} • Intensity: {config.motionIntensity}</p>
                                                </div>
                                            </div>
                                            <ChevronDown className={`w-5 h-5 text-white/40 transition-transform duration-300 ${expandedSections.includes('palette') ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {expandedSections.includes('palette') && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                >
                                                    <div className="px-8 pb-8 space-y-12 border-t border-white/5 pt-8">
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                                            {/* LEFT COLUMN: ASPECT RATIO & MOTION */}
                                                            <div className="space-y-12">
                                                                <div className="space-y-8">
                                                                    <div className="space-y-3">
                                                                        <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Standard Ratio</label>
                                                                        <div className="grid grid-cols-3 gap-3">
                                                                            {[
                                                                                { id: '16:9', desc: 'YouTube / Wide' },
                                                                                { id: '9:16', desc: 'Social / Vertical' },
                                                                                { id: '1:1', desc: 'Social / Square' }
                                                                            ].map((ratio) => (
                                                                                <button
                                                                                    key={ratio.id}
                                                                                    onClick={() => setConfig({ ...config, aspectRatio: ratio.id as any })}
                                                                                    className={`
                                                                                px-3 py-4 rounded-xl border transition-all text-left group/btn
                                                                                ${config.aspectRatio === ratio.id
                                                                                            ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                                                                                            : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/20'}
                                                                            `}
                                                                                >
                                                                                    <div className="text-[10px] font-black mb-1">{ratio.id}</div>
                                                                                    <div className="text-[8px] opacity-60 font-medium leading-tight">{ratio.desc}</div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Exotic Scopes</label>
                                                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                                            {[
                                                                                { id: '21:9', desc: 'Cinemascope' },
                                                                                { id: '4:3', desc: 'Classic TV' },
                                                                                { id: '3:2', desc: 'DSLR Photo' },
                                                                                { id: '2:3', desc: 'Portrait Art' }
                                                                            ].map((ratio) => (
                                                                                <button
                                                                                    key={ratio.id}
                                                                                    onClick={() => setConfig({ ...config, aspectRatio: ratio.id as any })}
                                                                                    className={`
                                                                                px-3 py-3 rounded-xl border transition-all text-left group/btn
                                                                                ${config.aspectRatio === ratio.id
                                                                                            ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                                                                                            : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/20'}
                                                                            `}
                                                                                >
                                                                                    <div className="text-[10px] font-black mb-1">{ratio.id}</div>
                                                                                    <div className="text-[8px] opacity-60 font-medium leading-tight">{ratio.desc}</div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <label className="text-[9px] font-black text-white/60 uppercase tracking-widest block">Motion Intensity</label>
                                                                    <div className="grid grid-cols-4 gap-2">
                                                                        {(['static', 'subtle', 'dynamic', 'cinematic'] as const).map((lvl) => (
                                                                            <button
                                                                                key={lvl}
                                                                                onClick={() => setConfig({ ...config, motionIntensity: lvl })}
                                                                                className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${config.motionIntensity === lvl ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white/[0.02] border-white/5 text-white/40'}`}
                                                                            >
                                                                                {lvl}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* RIGHT COLUMN: PALETTE */}
                                                            <div className="space-y-4">
                                                                <label className="text-[9px] font-black text-white/50 uppercase tracking-widest block">Palette</label>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    {palettes.map((p) => (
                                                                        <button
                                                                            key={p.id}
                                                                            onClick={() => setConfig({ ...config, palette: p.id })}
                                                                            className={`
                                                                        flex items-center justify-center p-3 rounded-2xl border transition-all
                                                                        ${config.palette === p.id ? 'bg-white/10 border-white/20' : 'bg-white/[0.02] border-white/5'}
                                                                    `}
                                                                        >
                                                                            <div className="flex -space-x-2 mr-3">
                                                                                {p.colors.map((c, i) => (
                                                                                    <div key={i} className="w-4 h-4 rounded-full border border-black/50" style={{ backgroundColor: c }}></div>
                                                                                ))}
                                                                            </div>
                                                                            <span className="text-[10px] font-bold text-white/80">{p.name}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </section>

                                    {/* 05. Neural Prompt Guidance */}
                                    <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden transition-all hover:border-white/10">
                                        <button
                                            onClick={() => toggleSection('prompts')}
                                            className="w-full p-8 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                                                    <Sparkles className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">Neural Prompt Guidance</h3>
                                                    <p className="text-[9px] text-white/60 font-medium">Injecting raw semantic cues</p>
                                                </div>
                                            </div>
                                            <ChevronDown className={`w-5 h-5 text-white/40 transition-transform duration-300 ${expandedSections.includes('prompts') ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {expandedSections.includes('prompts') && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                >
                                                    <div className="px-8 pb-8 border-t border-white/5 pt-8">
                                                        <textarea
                                                            placeholder="Describe the textures, lighting, and visceral mood..."
                                                            value={config.atmosphericCues}
                                                            onChange={(e) => setConfig({ ...config, atmosphericCues: e.target.value })}
                                                            className="w-full h-32 bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 transition-all resize-none leading-relaxed"
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </section>

                                    {/* Synthesis Workflow Pipeline (ALWAYS VISIBLE IF GENERATING) */}
                                    {isGenerating && (
                                        <section className="p-6 rounded-[2.5rem] bg-gradient-to-br from-purple-500/5 to-transparent border border-white/5 space-y-4">
                                            <div className="flex items-center gap-2 text-white/50">
                                                <Zap className="w-4 h-4" />
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Aesthetic Synthesis Pipeline</h3>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                                {[
                                                    { step: "01", label: "Semantic Analysis", desc: "Extracting core intent", threshold: 10 },
                                                    { step: "02", label: "Aesthetic Mapping", desc: "Injecting style DNA", threshold: 30 },
                                                    { step: "03", label: "Latent Projection", desc: "Prompt tensor generation", threshold: 60 },
                                                    { step: "04", label: "Multi-Model Fusion", desc: "Parallel asset creation", threshold: 90 }
                                                ].map((s) => {
                                                    const isActive = isGenerating && progress >= s.threshold;
                                                    const isCurrent = isGenerating && progress >= s.threshold && progress < (s.threshold + 30);

                                                    return (
                                                        <div key={s.step} className={`space-y-2 transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`text-[10px] font-black ${isActive ? 'text-purple-500' : 'text-purple-500/60'}`}>
                                                                    {s.step}
                                                                </div>
                                                                {isCurrent && (
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping"></div>
                                                                )}
                                                            </div>
                                                            <div className="text-xs font-black text-white/90 leading-tight">
                                                                {s.label}
                                                                {isActive && progress >= (s.threshold + 20) && <span className="ml-2 text-purple-500">✓</span>}
                                                            </div>
                                                            <div className="text-[10px] text-white/60 leading-tight">{s.desc}</div>

                                                            {isGenerating && (
                                                                <div className="mt-2 h-[1px] w-full bg-white/5 overflow-hidden">
                                                                    <motion.div
                                                                        className="h-full bg-purple-500"
                                                                        initial={{ width: "0%" }}
                                                                        animate={{ width: isActive ? "100%" : "0%" }}
                                                                        transition={{ duration: 1 }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="mt-8 space-y-4">
                                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-purple-400/60">
                                                    <span>Total Synthesis Progress</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-gradient-to-r from-purple-600 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                                                        initial={{ width: "0%" }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ type: "spring", bounce: 0, duration: 1 }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-white/70 italic text-center animate-pulse">
                                                    {statusMessage || 'Calibrating aesthetic weights...'}
                                                </p>
                                            </div>
                                        </section>
                                    )}

                                    {/* Visual breather at bottom */}
                                    <div className="h-8" />
                                </div>

                                {/* Scroll Down Indicator */}
                                <AnimatePresence>
                                    {canScrollDown && !hintDismissed && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="px-5 py-2.5 bg-purple-600/20 backdrop-blur-2xl border border-purple-500/40 rounded-full flex items-center gap-3 shadow-[0_8px_32px_rgba(168,85,247,0.2)]">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Scroll for more</span>
                                                    <ChevronDown className="w-3.5 h-3.5 text-purple-400 animate-bounce" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Gradient Fade at bottom */}
                                <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#090b10] via-[#090b10]/80 to-transparent pointer-events-none z-10" />
                            </div>

                            {/* Footer */}
                            <div className="p-6 bg-[#0c0f16] border-t border-white/5 space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <div className="space-y-1">
                                        <div className="text-[11px] font-black text-white/90 uppercase tracking-[0.2em]">Projected Credit Consumption</div>
                                        <div className="text-[9px] text-white/60 font-medium mt-0.5">
                                            {sectionCount} sections × {config.imagesPerSection} shots @ 0.25cr
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="text-xl font-black text-white tracking-widest">
                                            ~{(sectionCount * config.imagesPerSection * 0.25).toFixed(1)} <span className="text-[10px] text-purple-500">CREDITS</span>
                                        </div>
                                        <div className="text-[8px] text-white/30 uppercase tracking-widest">Final burn calculated at runtime</div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    {isGenerating && onCancel && (
                                        <button
                                            onClick={onCancel}
                                            className="px-8 py-4 rounded-[2rem] bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black flex items-center justify-center gap-3 transition-all border border-red-500/20 group"
                                        >
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowConfirm(true)}
                                        disabled={isGenerating}
                                        className={`
                                    flex-1 py-4 rounded-[2rem] bg-purple-600 hover:bg-purple-500 text-white font-black flex items-center justify-center gap-4 transition-all
                                    shadow-[0_20px_60px_rgba(168,85,247,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group
                                `}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                                <span className="uppercase tracking-[0.2em] text-sm">Synthesizing Assets...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                                <span className="uppercase tracking-[0.3em] text-sm italic">Start Media Generation</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={showConfirm}
                title="Consumable Operation Warning"
                message={`This operation will potentially make numerous calls to the Image Generator - based on your current density settings this will cost approximately ${(sectionCount * config.imagesPerSection * 0.25).toFixed(1)} credits. Do you want to continue?`}
                confirmLabel="Continue"
                cancelLabel="Abort"
                onConfirm={() => {
                    setShowConfirm(false);
                    onStart(config);
                }}
                onClose={() => setShowConfirm(false)}
            />
        </>
    );
};
