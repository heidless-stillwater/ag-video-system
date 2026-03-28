import { Project, Script, UserPlan, ProjectEstimate } from '@/types';
import { PRICING_CONFIG } from '../config/pricing';

export const pricingService = {
    /**
     * Calculates estimated credits for the action-based pricing model.
     */
    calculateEstimate(project: Project, script: Script | null, plan: UserPlan = 'standard'): ProjectEstimate {
        const config = PRICING_CONFIG;
        const planDef = config.plans.find(p => p.id === plan) || config.plans[0];
        const multiplier = planDef.creditMultiplier;

        // 1. Action Model (Individual task costs)
        let actionTotal = 0;
        
        // Base costs for single-run actions
        actionTotal += config.actionModel.scriptGeneration;
        
        // Media Synthesis: 0.25cr per image. Account for imagesPerSection.
        const imagesPerSection = project.imagesPerSection || 1;
        const sectionCount = script?.sections?.length || Math.ceil((project.estimatedDuration || 1) / 1.5);
        actionTotal += (sectionCount * imagesPerSection) * config.actionModel.mediaSynthesis;

        actionTotal += config.actionModel.render;

        // Dynamic cost for TTS (per section)
        if (script && script.sections) {
            actionTotal += script.sections.length * config.actionModel.ttsSection;
        } else {
            // If no script yet, assume average section count based on duration
            actionTotal += sectionCount * config.actionModel.ttsSection;
        }

        return {
            actionTotal: Math.round(actionTotal * multiplier),
            durationTotal: 0, // Duration model DEPRECATED in Pure Prepaid
            multiplier,
            plan
        };
    },

    /**
     * Get available credit packs for purchase.
     */
    getCreditPacks() {
        return PRICING_CONFIG.creditPacks;
    },

    /**
     * Get a human-readable description of the pricing model.
     */
    getModelDescription(): string {
        return `Action-based pricing: ${PRICING_CONFIG.actionModel.scriptGeneration}cr Script, ${PRICING_CONFIG.actionModel.mediaSynthesis}cr/Image, ${PRICING_CONFIG.actionModel.render}cr Render, plus ${PRICING_CONFIG.actionModel.ttsSection}cr per Audio section.`;
    }
};
