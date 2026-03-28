# Billing & Credits Implementation

## Executive Summary
This document outlines the architecture and implementation of the Stripe integration and user credit system for the VideoSystem. It enables monetization through subscriptions (Standard/Premium) and one-time credit top-ups, while safeguarding system resources by requiring credits for video rendering.

## Architecture Overview
The system consists of:
1. **Stripe Service**: Server-side integration for creating checkout sessions and customer portal sessions.
2. **Credit Service**: Firestore-backed service using transactions to safely manage user credit balances.
3. **Webhook Handler**: Asynchronous event processing from Stripe to sync user plans, subscriptions, and grant credits.
4. **Enforcement Layer**: Integration into the Render API to prevent rendering without sufficient balances.

## Data Models
### User Interface Updates (`/src/types/index.ts`)
The `User` type now includes fields for billing and credits:
- `stripeCustomerId`: Unique ID in Stripe.
- `stripeSubscriptionId`: Active subscription ID.
- `subscriptionStatus`: Current state of the user's plan.
- `creditBalance`: Number of available rendering credits (default: 0).
- `lastCreditGrant`: Timestamp of the last monthly allowance grant.

## Core Components
### StripeService (`/src/lib/services/stripe-service.ts`)
- `createCheckoutSession`: Handles both subscriptions and one-time payments.
- `createPortalSession`: Redirects users to the Stripe Customer Portal for management.

### CreditService (`/src/lib/services/credit-service.ts`)
- `deductCredits`: Transactional deduction logic.
- `addCredits`: Transactional addition logic.
- `grantMonthlyCredits`: Resets balance based on active plan tiers.

## Integration Points
### Stripe Webhook (`/src/app/api/webhooks/stripe/route.ts`)
- `checkout.session.completed`: Grants one-time purchase credits.
- `customer.subscription.updated`: Syncs active plans and statuses.
- `invoice.payment_succeeded`: Automatically resets monthly credit allowances on successful billing cycles.

### Render API (`/src/app/api/projects/[id]/render/route.ts`)
- **Credit Check**: Before rendering, the system checks if the user has at least 1 credit.
- **Deduction**: If successful, 1 credit is deducted before the render engine is initialized.
- **Error Handling**: Returns `402 Payment Required` if the balance is insufficient.

## Security Model
- **Webhook Signature Verification**: Uses `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET` to prevent spoofing.
- **Idempotency**: Handled by Firestore transactions in the `CreditService`.

## Implementation Checklist
- [x] Define Types and Interfaces
- [x] Initialize Firestore defaults
- [x] Install Stripe dependency
- [x] Create Stripe Service
- [x] Create Credit Service
- [x] Implement Webhook Route
- [x] Integrate Credit Check into Render API
- [ ] Create Pricing/Checkout UI
- [ ] Configure Stripe Dashboard (Products/Prices/Webhooks)
