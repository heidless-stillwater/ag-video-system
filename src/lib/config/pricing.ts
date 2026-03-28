import { UserPlan, PlanDefinition, PricingConfig } from '@/types';

export const PLAN_DEFINITIONS: PlanDefinition[] = [
    {
        id: 'guest',
        displayName: 'Novice',
        priceUsd: 0,
        creditMultiplier: 1.0,
        bonusCreditsOnPurchase: 0,
        isPublic: true,
        features: {
            maxProjects: 3,
            maxRendersPerMonth: 2,
            voiceCloning: false,
            commercialRights: false,
            priorityRendering: false,
            watermarkFree: false,
            stagingMode: false,
            apiAccess: false,
        },
        limits: {
            maxStorageGb: 1,
            maxVideoDurationMinutes: 5,
            concurrentRenders: 1,
        }
    },
    {
        id: 'trial',
        displayName: 'Aspirant (Trial)',
        priceUsd: 0,
        creditMultiplier: 1.0,
        bonusCreditsOnPurchase: 0,
        isPublic: false,
        features: {
            maxProjects: 3,
            maxRendersPerMonth: 5,
            voiceCloning: false,
            commercialRights: false,
            priorityRendering: false,
            watermarkFree: false,
            stagingMode: false,
            apiAccess: false,
        },
        limits: {
            maxStorageGb: 1,
            maxVideoDurationMinutes: 10,
            concurrentRenders: 1,
        }
    },
    {
        id: 'standard',
        displayName: 'Hobbyist',
        priceUsd: 29,
        stripePriceId: process.env.STRIPE_PRICE_STANDARD,
        creditMultiplier: 1.0,
        bonusCreditsOnPurchase: 100,
        isPublic: true,
        features: {
            maxProjects: 10,
            maxRendersPerMonth: 50,
            voiceCloning: true,
            commercialRights: true,
            priorityRendering: false,
            watermarkFree: true,
            stagingMode: false,
            apiAccess: false,
        },
        limits: {
            maxStorageGb: 10,
            maxVideoDurationMinutes: 30,
            concurrentRenders: 2,
        }
    },
    {
        id: 'premium',
        displayName: 'Semi-Pro',
        priceUsd: 99,
        stripePriceId: process.env.STRIPE_PRICE_PREMIUM,
        creditMultiplier: 0.8,
        bonusCreditsOnPurchase: 500,
        isPublic: true,
        features: {
            maxProjects: -1,
            maxRendersPerMonth: -1,
            voiceCloning: true,
            commercialRights: true,
            priorityRendering: true,
            watermarkFree: true,
            stagingMode: true,
            apiAccess: true,
        },
        limits: {
            maxStorageGb: 100,
            maxVideoDurationMinutes: 120,
            concurrentRenders: 5,
        }
    },
    {
        id: 'custom',
        displayName: 'Professional',
        priceUsd: 0, // Configured per-client
        creditMultiplier: 0.5,
        bonusCreditsOnPurchase: 0,
        isPublic: false,
        features: {
            maxProjects: -1,
            maxRendersPerMonth: -1,
            voiceCloning: true,
            commercialRights: true,
            priorityRendering: true,
            watermarkFree: true,
            stagingMode: true,
            apiAccess: true,
        },
        limits: {
            maxStorageGb: 1000,
            maxVideoDurationMinutes: 300,
            concurrentRenders: 10,
        }
    }
];

export const PRICING_CONFIG: PricingConfig = {
    actionModel: {
        scriptGeneration: 1,
        mediaSynthesis: 0.25, // Align with frontend: 0.25cr per image
        ttsSection: 1,
        render: 1,
    },
    creditPacks: [
        { id: 'pack_100',  credits: 100,  priceUsd: 10,  stripePriceId: process.env.STRIPE_PRICE_PACK_100 || '' },
        { id: 'pack_300',  credits: 300,  priceUsd: 25,  stripePriceId: process.env.STRIPE_PRICE_PACK_300 || '' },
        { id: 'pack_750',  credits: 750,  priceUsd: 50,  stripePriceId: process.env.STRIPE_PRICE_PACK_750 || '' },
    ],
    plans: PLAN_DEFINITIONS,
};
