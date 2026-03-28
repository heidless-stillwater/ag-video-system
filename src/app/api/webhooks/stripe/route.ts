import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/services/stripe-service';
import { creditService } from '@/lib/services/credit-service';
import { planService } from '@/lib/services/plan-service';
import { stripeService } from '@/lib/services/stripe-service';
import { UserPlan } from '@/types';
import { PLAN_DEFINITIONS } from '@/lib/config/pricing';

/**
 * Handle incoming Stripe webhook events to synchronize user state,
 * credit balances, and subscription statuses with the new "Pure Prepaid" model.
 */
export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature');

    if (!signature) {
        return new Response('Invalid Stripe Signature', { status: 400 });
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET || ''
        );
    } catch (err: any) {
        console.error(`[Stripe Webhook] Error: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const object = event.data.object as any;

    try {
        switch (event.type) {
            /**
             * Handles one-time credit pack purchases.
             */
            case 'checkout.session.completed': {
                const userId = object.metadata?.userId;
                const purchaseType = object.metadata?.purchaseType;
                
                if (!userId) {
                    console.warn('[Stripe Webhook] Received checkout.session.completed without userId metadata');
                    break;
                }

                if (purchaseType === 'credit-pack') {
                    const credits = Number(object.metadata?.creditAmount);
                    const packId = object.metadata?.packId;
                    
                    if (credits > 0) {
                        await creditService.addCredits(userId, credits, 'purchase', {
                            packId,
                            stripeSessionId: object.id,
                        });
                        console.log(`[Stripe Webhook] Granted ${credits} credits to ${userId} from pack ${packId}`);
                    }
                } else if (purchaseType === 'plan-subscription') {
                    // Plan changes are better handled in subscription events
                    // but we can log the initiation here if needed.
                }
                break;
            }

            /**
             * Handles subscription lifecycle.
             */
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const userId = object.metadata?.userId;
                const customerId = object.customer;
                
                let userProfile = null;
                if (userId) {
                    // Try by metadata first
                } else {
                    // Fallback to customer ID lookup
                    userProfile = await stripeService.resolveUserByCustomerId(customerId);
                }

                const targetUserId = userId || userProfile?.id;
                if (!targetUserId) {
                    console.warn(`[Stripe Webhook] ${event.type} received but could not resolve targetUserId. customerId=${customerId}`);
                    break;
                }

                const priceId = object.items.data[0].price.id;
                const status = object.status;
                const match = PLAN_DEFINITIONS.find(p => p.stripePriceId === priceId);
                const planId = (match?.id as UserPlan) || 'standard';

                console.log(`[Stripe Webhook] ${event.type}: targetUserId=${targetUserId}, status=${status}, priceId=${priceId}, matchedPlan=${match?.id || 'standard'}`);

                // Map Stripe status to active plan logic
                if (status === 'active' || status === 'trialing') {
                    await planService.recordPlanChange(
                        targetUserId,
                        planId,
                        'upgrade',
                        'stripe-webhook'
                    );
                    
                    // Bonus credits for new subscription
                    const planDef = PLAN_DEFINITIONS.find(p => p.id === planId);
                    if (event.type === 'customer.subscription.created' && planDef?.bonusCreditsOnPurchase) {
                        await creditService.addCredits(targetUserId, planDef.bonusCreditsOnPurchase, 'plan-bonus', {
                            reason: `New ${planId} plan bonus`,
                        });
                    }
                }
                break;
            }

            /**
             * Handles subscription cancellation.
             */
            case 'customer.subscription.deleted': {
                const customerId = object.customer;
                const user = await stripeService.resolveUserByCustomerId(customerId);
                
                if (user) {
                    await planService.recordPlanChange(
                        user.id,
                        'guest',
                        'downgrade',
                        'stripe-webhook'
                    );
                    console.log(`[Stripe Webhook] Downgraded ${user.id} to guest after subscription deletion`);
                }
                break;
            }

            /**
             * Handles periodic payments (for renewals).
             * We DON'T grant credits on renewal in the pure prepaid model.
             * But we might use this to clear pending arrears if we had any.
             */
            case 'invoice.payment_succeeded': {
                const customerId = object.customer;
                if (object.billing_reason === 'subscription_cycle') {
                    // Simply log it
                    console.log(`[Stripe Webhook] Periodic billing succeeded for customer ${customerId}`);
                }
                break;
            }

            /**
             * Handles payment failures.
             */
            case 'invoice.payment_failed': {
                const customerId = object.customer;
                console.warn(`[Stripe Webhook] Payment failed for customer ${customerId}. Next attempt will be handled by Stripe.`);
                // Potential Phase 5: Trigger notification or lock account features
                break;
            }

            /**
             * Handles auto-refill payments (off-session).
             */
            case 'payment_intent.succeeded': {
                const userId = object.metadata?.userId;
                const purchaseType = object.metadata?.purchaseType;
                
                if (userId && purchaseType === 'auto-refill') {
                    const credits = Number(object.metadata?.creditAmount);
                    if (credits > 0) {
                        await creditService.addCredits(userId, credits, 'purchase', {
                            type: 'auto-refill',
                            stripePaymentIntentId: object.id,
                        });
                        console.log(`[Stripe Webhook] Auto-refill of ${credits} credits succeeded for ${userId}`);
                    }
                }
                break;
            }

            default:
                console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
    } catch (err: any) {
        console.error(`[Stripe Webhook] Failed to process event ${event.type}:`, err);
        return new Response('Webhook processing failed', { status: 500 });
    }

    return NextResponse.json({ received: true });
}
