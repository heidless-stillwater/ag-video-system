'use client';

import React from 'react';
import { PlanDefinition } from '@/types';
import { PlanCard } from './PlanCard';

interface PlanComparisonGridProps {
    plans: PlanDefinition[];
    currentPlanId: string;
    onUpgrade: (planId: string) => void;
    onCancel: (planId: string) => void;
    isLoading?: string | null;
}

export const PlanComparisonGrid: React.FC<PlanComparisonGridProps> = ({ 
    plans, 
    currentPlanId, 
    onUpgrade, 
    onCancel,
    isLoading = null
}) => {
    // Only show public plans for the comparison grid
    const publicPlans = plans.filter(p => p.isPublic);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {publicPlans.map((plan) => (
                <PlanCard
                    key={plan.id}
                    plan={plan}
                    isCurrent={currentPlanId === plan.id}
                    isFeatured={plan.id === 'premium'}
                    onUpgrade={onUpgrade}
                    onCancel={onCancel}
                    isLoading={isLoading === plan.id}
                />
            ))}
        </div>
    );
};
