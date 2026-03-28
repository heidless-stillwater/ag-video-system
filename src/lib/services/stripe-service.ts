import Stripe from 'stripe';
import { db } from '../firebase-admin';
import { User, UserPlan } from '@/types';
import { PRICING_CONFIG, PLAN_DEFINITIONS } from '../config/pricing';

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-01-27.acacia' as any,
});

export const stripeService = {
    /**
     * Ensures a Stripe Customer exists for the given user, creating one if necessary.
     */
    async ensureStripeCustomer(userId: string): Promise<string> {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) throw new Error('User not found');
        
        const userData = userDoc.data() as User;
        console.log(`[Stripe DBG] ensureStripeCustomer: userId=${userId}, existingId=${userData.stripeCustomerId}`);
        if (userData.stripeCustomerId) return userData.stripeCustomerId;

        console.log(`[Stripe DBG] Creating new customer for email=${userData.email}`);
        const customer = await stripe.customers.create({
            email: userData.email,
            name: userData.displayName,
            metadata: { userId },
        });

        console.log(`[Stripe DBG] Created customerId=${customer.id}`);
        await userRef.update({ stripeCustomerId: customer.id });
        return customer.id;
    },

    /**
     * Resolve a VideoSystem user by their Stripe Customer UID.
     */
    async resolveUserByCustomerId(customerId: string): Promise<User | null> {
        const snapshot = await db.collection('users')
            .where('stripeCustomerId', '==', customerId)
            .limit(1)
            .get();
        
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
    },

    /**
     * Create a Stripe Checkout session for a one-time credit pack purchase.
     */
    async createCreditPackCheckout(userId: string, packId: string) {
        const pack = PRICING_CONFIG.creditPacks.find(p => p.id === packId);
        if (!pack) throw new Error(`Invalid credit pack ID: ${packId}`);
        
        const customerId = await this.ensureStripeCustomer(userId);
        
        console.log(`[Stripe DBG] createCreditPackCheckout: userId=${userId}, priceId=${pack.stripePriceId}, customerId=${customerId}`);
        
        return await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'payment',
            line_items: [{ price: pack.stripePriceId, quantity: 1 }],
            metadata: {
                userId,
                purchaseType: 'credit-pack',
                packId,
                creditAmount: String(pack.credits),
            },
            success_url: `${APP_URL}/settings/billing?tab=credits&status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${APP_URL}/settings/billing?tab=credits&status=cancel`,
        });
    },

    /**
     * Create a Stripe Checkout session for a plan (subscription).
     * Handles both new subscriptions and existing subscription updates (with proration).
     */
    async createPlanCheckout(userId: string, newPlan: UserPlan) {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data() as User;
        
        const planDef = PLAN_DEFINITIONS.find(p => p.id === newPlan);
        if (!planDef?.stripePriceId) throw new Error(`Plan ${newPlan} has no Stripe price ID configured.`);
        
        const customerId = await this.ensureStripeCustomer(userId);
        
        console.log(`[Stripe DBG] createPlanCheckout: userId=${userId}, newPlan=${newPlan}, priceId=${planDef.stripePriceId}, customerId=${customerId}`);
        
        // If they already have an active subscription, update it directly with proration
        if (userData.stripeSubscriptionId && userData.subscriptionStatus === 'active') {
             const subscription = await stripe.subscriptions.retrieve(userData.stripeSubscriptionId);
             await stripe.subscriptions.update(userData.stripeSubscriptionId, {
                items: [{
                    id: subscription.items.data[0].id,
                    price: planDef.stripePriceId,
                }],
                proration_behavior: 'always_invoice',
                metadata: { userId, plan: newPlan },
             });
             // Return a success URL for the frontend to "redirect" to
             return { url: `${APP_URL}/settings/billing?tab=plan&status=success` };
        }

        // Otherwise (new sub), create a checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: planDef.stripePriceId, quantity: 1 }],
            subscription_data: {
                metadata: { userId, plan: newPlan },
            },
            metadata: {
                userId,
                purchaseType: 'plan-subscription',
                plan: newPlan,
            },
            success_url: `${APP_URL}/settings/billing?tab=plan&status=success`,
            cancel_url: `${APP_URL}/settings/billing?tab=plan&status=cancel`,
        });

        return { url: session.url || `${APP_URL}/settings/billing` };
    },

    /**
     * Cancel an active Stripe subscription.
     */
    async cancelSubscription(userId: string) {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data() as User;
        
        if (!userData.stripeSubscriptionId) throw new Error('No active subscription found for user');
        
        return await stripe.subscriptions.cancel(userData.stripeSubscriptionId);
        // This will trigger the 'customer.subscription.deleted' webhook
    },

    /**
     * Get a preview of proration costs for changing plans mid-cycle.
     */
    async getProrationPreview(userId: string, newPriceId: string) {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data() as User;
        
        if (!userData.stripeSubscriptionId || !userData.stripeCustomerId) return null;
        
        const subscription = await stripe.subscriptions.retrieve(userData.stripeSubscriptionId);
        const prorationDate = Math.floor(Date.now() / 1000);

        console.log(`[Stripe DBG] getProrationPreview: userId=${userId}, subId=${userData.stripeSubscriptionId}, newPriceId=${newPriceId}`);

        const preview = await stripe.invoices.createPreview({
            customer: userData.stripeCustomerId,
            subscription: userData.stripeSubscriptionId,
            subscription_details: {
                items: [{
                    id: subscription.items.data[0].id,
                    price: newPriceId,
                }],
                proration_date: prorationDate,
            }
        });
        
        return {
            amount: preview.total,   // In cents (matches frontend expectation)
            currency: preview.currency,
            nextInvoiceDate: preview.period_end, // Unix timestamp (seconds)
            description: preview.lines.data[0]?.description || 'Upgrade adjustment'
        };
    },

    /**
     * Trigger a background payment for auto-refill credits (off-session).
     */
    async triggerAutoRefill(userId: string) {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data() as User;
        
        if (!userData.autoRefill?.enabled || !userData.stripeCustomerId) return null;
        if (userData.creditBalance > userData.autoRefill.threshold) return null;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: 1000, // $10 for base auto-refill pack
            currency: 'usd',
            customer: userData.stripeCustomerId,
            off_session: true,
            confirm: true,
            payment_method: userData.stripeDefaultPaymentMethod,
            metadata: {
                userId,
                purchaseType: 'auto-refill',
                creditAmount: String(userData.autoRefill.packSize),
            },
        });
        
        return paymentIntent;
    },

    /**
     * Creates a Stripe Customer Portal session.
     */
    async createPortalSession(userId: string) {
        const customerId = await this.ensureStripeCustomer(userId);
        
        console.log(`[Stripe DBG] createPortalSession: userId=${userId}, customerId=${customerId}`);

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${APP_URL}/settings/billing`,
        });

        return session;
    }
};
