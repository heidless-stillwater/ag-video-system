import { db } from '../firebase-admin';
import { User, UserPlan, PlanChangeRecord } from '@/types';
import { PLAN_DEFINITIONS } from '../config/pricing';
import { stripeService } from './stripe-service';

export const planService = {
    /**
     * Get all public plan definitions for pricing page.
     */
    getAvailablePlans() {
        return PLAN_DEFINITIONS.filter(p => p.isPublic);
    },

    /**
     * Get the full definition for a specific plan.
     */
    getPlanDefinition(planId: UserPlan) {
        return PLAN_DEFINITIONS.find(p => p.id === planId) || PLAN_DEFINITIONS[0];
    },

    /**
     * Check if a user's current plan includes a specific feature.
     */
    async checkFeatureAccess(userId: string, featureKey: keyof typeof PLAN_DEFINITIONS[0]['features']): Promise<boolean> {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return false;
        
        const userData = userDoc.data() as User;
        const currentPlan = userData.plan || 'guest';
        
        const planDef = this.getPlanDefinition(currentPlan);
        return !!planDef.features[featureKey];
    },

    /**
     * Log a plan change and update the user document.
     * This is usually called from webhook handlers or admin overrides.
     */
    async recordPlanChange(
        userId: string, 
        newPlan: UserPlan, 
        changeType: PlanChangeRecord['changeType'],
        initiatedBy: string,
        proratedAmount?: number
    ) {
        const userRef = db.collection('users').doc(userId);
        const recordRef = db.collection('planChangeHistory').doc();
        
        return await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) throw new Error('User not found');
            
            const userData = userDoc.data() as User;
            const previousPlan = userData.plan || 'guest';
            
            const prevDef = this.getPlanDefinition(previousPlan);
            const newDef = this.getPlanDefinition(newPlan);
            
            // 1. Write the change record
            const record: PlanChangeRecord = {
                id: recordRef.id,
                userId,
                previousPlan,
                newPlan,
                changeType,
                stripeSubscriptionId: userData.stripeSubscriptionId,
                previousPriceUsd: prevDef.priceUsd,
                newPriceUsd: newDef.priceUsd,
                proratedAmount,
                initiatedBy,
                effectiveAt: new Date(),
                createdAt: new Date(),
            };
            t.set(recordRef, record);
            
            // 2. Update user doc
            t.update(userRef, {
                plan: newPlan,
                previousPlan,
                planNickname: null, // Reset nickname to force dynamic tier display (Semi-Pro/Hobbyist)
                planStartedAt: new Date(),
                // Keep stripe details intact handled by Stripe Service
                updatedAt: new Date(),
            });
            
            return record;
        });
    },

    /**
     * Cancels the user's subscription in Stripe and downgrades to guest.
     */
    async cancelPlan(userId: string) {
        // Cancel in Stripe -> This will trigger a webhook that actually updates the plan later
        // But for immediacy, we can also soft downgrade them if desired.
        // For consistency, let's let Stripe Webhook handle the actual DB mutation to prevent race conditions.
        await stripeService.cancelSubscription(userId);
        return true;
    },

    /**
     * Get preview of proration costs before a mid-cycle change.
     */
    async getProrationPreview(userId: string, newPlan: UserPlan) {
        const planDef = this.getPlanDefinition(newPlan);
        if (!planDef.stripePriceId) throw new Error('Plan has no Stripe price ID configured.');
        
        return await stripeService.getProrationPreview(userId, planDef.stripePriceId);
    },

    /**
     * Get paginated plan change history for a user.
     */
    async getPlanChangeHistory(userId: string, limit: number = 20) {
        const snapshot = await db.collection('planChangeHistory')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
            
        return snapshot.docs.map(doc => doc.data() as PlanChangeRecord);
    }
};
