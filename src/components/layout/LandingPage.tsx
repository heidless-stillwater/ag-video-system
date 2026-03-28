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

export function LandingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
    const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();

    const openAuth = (mode: 'login' | 'signup', planId?: string) => {
        if (user && planId) {
            // Already logged in - take them to project dashboard or billing
            router.push('/admin/credits'); // Or a specific /billing route if it exists
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
        <div className="min-h-screen bg-[#020617] selection:bg-indigo-500/30">
            {/* Global Navigation Wrapper? (Optional, can be inside children or separate) */}
            
            <LandingHero onAuthClick={openAuth} />
            
            <LandingFeatures />

            <TestimonialScroller />

            <LandingPricing onAuthClick={openAuth} />
            
            <LandingIncentive onAuthClick={openAuth} />

            {/* Simple Premium Footer */}
            <footer className="w-full py-20 bg-[#020617] border-t border-white/5">
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                    <div className="flex items-center gap-4">
                        <span className="text-white font-black tracking-tight text-xl italic uppercase">Synthesis Studio.</span>
                        <span className="opacity-20">// v2.4.0</span>
                    </div>
                    
                    <div className="flex gap-10">
                        <a href="#" className="hover:text-indigo-400 transition-colors">Documentation</a>
                        <a href="#" className="hover:text-indigo-400 transition-colors">Telemetry</a>
                        <a href="#" className="hover:text-indigo-400 transition-colors">Privacy</a>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-2 text-slate-600">
                        <span>EST. 2026 // NARRATIVE_ENGINE_PROTOCOLS</span>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span>ALL_SYSTEMS_OPERATIONAL</span>
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
        </div>
    );
}
