'use client';

import React, { useRef, useEffect } from 'react';
import { LucideIcon, PenLine, Clock, AlignLeft, Info } from 'lucide-react';

interface ScriptEditorProps {
    content: string;
    onChange: (value: string) => void;
    title?: string;
    sectionIndex: number;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
    content,
    onChange,
    title,
    sectionIndex
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [content]);

    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const readingTimeSeconds = Math.round((wordCount / 150) * 60);

    return (
        <div className="group relative bg-slate-950/40 rounded-2xl border border-white/5 overflow-hidden transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:shadow-blue-500/5">
            {/* Header / Meta */}
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                        <PenLine size={14} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block leading-none mb-1">
                            Script Section {sectionIndex + 1}
                        </span>
                        <h4 className="text-xs font-bold text-slate-300 leading-none">
                            {title || 'Untitled Section'}
                        </h4>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock size={12} className="opacity-50" />
                        <span className="text-[10px] font-mono uppercase tracking-tighter">~{readingTimeSeconds}s Read</span>
                    </div>
                    <div className="w-px h-3 bg-white/5"></div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <AlignLeft size={12} className="opacity-50" />
                        <span className="text-[10px] font-mono uppercase tracking-tighter">{wordCount} Words</span>
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="p-5">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-transparent text-slate-200 text-sm leading-relaxed font-medium focus:outline-none transition-all placeholder:text-slate-700 border-none p-0 focus:ring-0 min-h-[100px] resize-none selection:bg-blue-500/30"
                    placeholder="Enter narration for this section..."
                />
            </div>

            {/* Footer / Context */}
            <div className="px-5 py-2 border-t border-white/5 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-2 text-[9px] text-slate-600 italic">
                    <Info size={10} />
                    <span>Gemini-optimized narration script</span>
                </div>
                <div className="flex items-center gap-4">
                     <span className="text-[9px] font-mono text-slate-600 uppercase tracking-tighter">Status: Finalized</span>
                </div>
            </div>

            {/* Reflection Effect */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-blue-500/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        </div>
    );
};
