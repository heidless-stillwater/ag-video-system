'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingIncentive } from '@/components/landing/LandingIncentive';
import { TestimonialScroller } from '@/components/landing/TestimonialScroller';
import { LandingPricing } from '@/components/landing/LandingPricing';

import { LandingNav } from '@/components/landing/LandingNav';
import { ShowcaseGrid } from '@/components/landing/ShowcaseGrid';
import { CollectiveIntelligence } from '@/components/landing/CollectiveIntelligence';
import { Icons } from '@/components/ui/Icons';

export function LandingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
    const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();

    const openAuth = (mode: 'login' | 'signup', planId?: string) => {
        if (user && planId) {
            router.push('/admin/credits');
            return;
        }

        setAuthMode(mode);
        setSelectedPlanId(planId);
        
        if (planId) {
            sessionStorage.setItem('pending_plan_id', planId);
        } else {
            sessionStorage.removeItem('pending_plan_id');
        }
        
        setIsAuthModalOpen(true);
    };

    return (
        <main className="min-h-screen bg-[#0a0a0f] text-white selection:bg-indigo-500/30">
            <LandingNav onAuthClick={openAuth} />
            
            <LandingHero onAuthClick={openAuth} />
            
            <ShowcaseGrid />

            <CollectiveIntelligence />

            <LandingIncentive onAuthClick={openAuth} />

            {/* Footer matching PromptTool style */}
            <footer className="py-24 px-6 border-t border-white/5 bg-[#050505]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12 text-slate-500">
                    <div className="space-y-4 text-center md:text-left">
                        <div className="flex items-center gap-2 justify-center md:justify-start">
                            <Icons.sparkles className="text-indigo-500 w-5 h-5" />
                            <span className="font-black uppercase tracking-tighter text-white">Synthesis Studio</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium max-w-xs">
                          The world&apos;s first data-driven documentary engine. Transform research into cinematic excellence.
                        </p>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-3 text-[10px] font-black uppercase tracking-widest opacity-40">
                        <span>© 2026 Synthesis Studio • NanoBanana Collective</span>
                        <div className="flex gap-6">
                          <a href="#" className="hover:text-white transition-colors">Documentation</a>
                          <a href="#" className="hover:text-white transition-colors">Telemetry</a>
                        </div>
                    </div>
                </div>
            </footer>

            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                initialMode={authMode}
                selectedPlanId={selectedPlanId}
            />
        </main>
    );
}
