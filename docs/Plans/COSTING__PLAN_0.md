# COSTING__PLAN_0 — Credit & Plan Management Refactor

> **Date:** 2026-03-25 (rev.2)  
> **Scope:** Refactor the entire costing, credit management, **and account plan purchase management** with role-based views, unified Credit Management dashboard, and **end-to-end Stripe integration**.

---

## 1. Problem Statement

The current credit system is a patchwork of partially-implemented features:

| Issue | Detail |
|---|---|
| **Hybrid ↔ Prepaid conflict** | `credit-service.ts` still has `grantMonthlyCredits()` (subscription model) while the KI mandates **Pure Prepaid** |
| **No transaction history** | Credits are deducted but no `creditTransactions` collection is written — no audit trail |
| **Hardcoded costs** | Backend uses flat `MEDIA_COST = 1` while frontend shows `0.25cr/image` — discrepancy flagged in last session |
| **No role-based views** | Admin (`su`/`admin`) and regular `user` roles exist in types but share identical UI |
| **No purchase flow** | `PricingCard` shows subscription plans. No one-time credit pack purchase UI exists |
| **No plan lifecycle** | Plan upgrade/downgrade has no confirmation, no proration logic, no change history |
| **No feature gating** | Plan tier (`guest`→`custom`) doesn't gate features beyond a simple credit multiplier |
| **No live reporting** | No dashboard for real-time credit status, usage trends, or cross-account visibility |

---

## 2. Architecture — Role Separation

The `UserRole` type already defines three roles: `su`, `admin`, `user`.

### 2.1 Admin View (`su` & `admin`)

A **Credit Management Dashboard** accessible at `/admin/credits` with:

| Panel | Description |
|---|---|
| **System Overview** | Aggregate stats: total credits in circulation, total spent (all-time/30d/7d/24h), total purchased |
| **User Accounts Table** | Searchable/sortable table of all users with columns: Name, Email, Role, **Plan**, Balance, Total Spent, Last Activity. Click → drilldown |
| **User Drilldown** | Full transaction history for a selected user, with filtering by type/date/action |
| **Plan Management** | View/change any user's plan directly, grant trials, set custom plans. Full plan change history per user |
| **Manual Top-Up** | Refactored `CreditTopUp` component embedded in dashboard (currently at `/admin/tools`) |
| **Plan & Pricing Configuration** | Live editor for plan definitions (features, limits, pricing) and `PRICING_CONFIG` values (action costs, multipliers). Preview mode before save |
| **System Alerts** | Low-balance users, abnormal spend patterns, failed transactions, plan expirations |

### 2.2 User View (`user`)

A **My Credits** dashboard accessible at `/settings/billing` (replaces current page) with:

| Panel | Description |
|---|---|
| **Balance Card** | Large, real-time credit balance with trend sparkline (7-day) |
| **Current Plan Card** | Shows active plan tier, nickname, features, renewal date, and plan multiplier discount |
| **Upgrade / Downgrade** | Side-by-side plan comparison cards with Stripe Checkout for upgrade or downgrade. Shows proration preview |
| **Purchase Credits** | Credit pack cards (e.g., 100cr/$10, 300cr/$25, 750cr/$50) with Stripe Checkout |
| **Auto-Refill Toggle** | Enable/disable pay-as-you-go with configurable threshold & pack size |
| **Usage History** | Paginated transaction log: date, action, project, credits ±, balance after |
| **Plan Change History** | Log of all plan changes with effective dates |
| **Cost Estimator** | Interactive calculator: select action type → see cost in credits (respects plan multiplier) |

---

## 3. Data Model Changes

### 3.1 `CreditTransaction` (NEW Firestore collection: `creditTransactions`)

```typescript
interface CreditTransaction {
    id: string;
    userId: string;
    type: 'deduction' | 'purchase' | 'grant' | 'refund' | 'admin-topup' | 'plan-bonus';
    amount: number;           // Always positive; sign inferred from type
    balanceAfter: number;     // Snapshot of balance post-transaction
    action?: string;          // e.g. 'script-generation', 'media-synthesis', 'render', 'plan-upgrade'
    projectId?: string;
    metadata?: Record<string, any>;  // quality tier, Stripe session ID, admin userId, etc.
    createdAt: Date;
}
```

### 3.2 `PlanChangeRecord` (NEW Firestore collection: `planChangeHistory`)

```typescript
interface PlanChangeRecord {
    id: string;
    userId: string;
    previousPlan: UserPlan;
    newPlan: UserPlan;
    changeType: 'upgrade' | 'downgrade' | 'admin-override' | 'trial-start' | 'trial-expire' | 'cancellation';
    stripeSubscriptionId?: string;
    previousPriceUsd?: number;
    newPriceUsd?: number;
    proratedAmount?: number;     // Credit/charge from mid-cycle change
    initiatedBy: string;         // userId of who made the change (self or admin)
    effectiveAt: Date;
    createdAt: Date;
}
```

### 3.3 `PlanDefinition` (NEW — config-driven or Firestore-backed)

```typescript
interface PlanDefinition {
    id: UserPlan;                // 'guest' | 'trial' | 'standard' | 'premium' | 'custom'
    displayName: string;         // e.g. 'Hobbyist', 'Semi-Pro'
    priceUsd: number;            // Monthly price (0 for guest/trial)
    stripePriceId?: string;      // Stripe recurring price ID
    creditMultiplier: number;    // Discount multiplier (1.0 = no discount)
    bonusCreditsOnPurchase: number;  // One-time bonus credits when subscribing
    features: PlanFeatureSet;
    limits: PlanLimits;
    isPublic: boolean;           // Whether shown on pricing page (custom = false)
}

interface PlanFeatureSet {
    maxProjects: number;         // -1 = unlimited
    maxRendersPerMonth: number;  // -1 = unlimited
    voiceCloning: boolean;
    commercialRights: boolean;
    priorityRendering: boolean;
    watermarkFree: boolean;
    stagingMode: boolean;
    apiAccess: boolean;
}

interface PlanLimits {
    maxStorageGb: number;
    maxVideoDurationMinutes: number;
    concurrentRenders: number;
}
```

### 3.4 `User` type updates

```diff
 // Remove legacy subscription fields
-lastCreditGrant?: Date;

 // Add plan lifecycle fields
+planStartedAt?: Date;         // When current plan became active
+planExpiresAt?: Date;         // For time-limited plans (trial)
+previousPlan?: UserPlan;      // For rollback reference

 // Add auto-refill config
+autoRefill?: {
+    enabled: boolean;
+    threshold: number;      // Trigger when balance falls below this
+    packSize: number;       // Credits to purchase
+    stripePriceId: string;  // Stripe price for auto-refill
+};
```

### 3.5 `PRICING_CONFIG` updates

```diff
 export const PRICING_CONFIG: PricingConfig = {
     actionModel: {
         scriptGeneration: 1,
-        mediaSynthesis: 1,
+        mediaSynthesis: 0.25,  // Align with frontend: 0.25cr per image
         ttsSection: 1,
         render: 1,
     },
+    creditPacks: [
+        { id: 'pack_100',  credits: 100,  priceUsd: 10,  stripePriceId: 'price_xxx' },
+        { id: 'pack_300',  credits: 300,  priceUsd: 25,  stripePriceId: 'price_yyy' },
+        { id: 'pack_750',  credits: 750,  priceUsd: 50,  stripePriceId: 'price_zzz' },
+    ],
+    plans: PlanDefinition[],  // Loaded from config or Firestore
```

---

## 4. Service Layer Refactors

### 4.1 `credit-service.ts` → Full rewrite

| Method | Change |
|---|---|
| `deductCredits()` | **Keep** core logic. **Add** `CreditTransaction` write inside the same Firestore transaction |
| `addCredits()` | **Keep** core logic. **Add** transaction record with `type: 'purchase'` |
| `grantMonthlyCredits()` | **DELETE** — contradicts Pure Prepaid model |
| `syncSubscription()` | **KEEP** — still needed for Stripe status tracking |
| `getTransactionHistory(userId, filters)` | **NEW** — paginated query on `creditTransactions` with date/type/action filters |
| `getSystemStats()` | **NEW** — aggregate queries for admin dashboard (total balance, total spent, user count) |
| `getUserSummaries(search, sort, page)` | **NEW** — admin: paginated user list with credit stats |
| `checkAutoRefill(userId)` | **NEW** — check threshold, trigger Stripe checkout if enabled |

### 4.2 `plan-service.ts` → NEW

| Method | Purpose |
|---|---|
| `getAvailablePlans()` | Return all public `PlanDefinition` entries for the pricing page |
| `getPlanDefinition(plan)` | Return a single plan's full definition including features & limits |
| `changePlan(userId, newPlan, initiatedBy)` | Orchestrate plan change: validate, create Stripe subscription (or cancel old), update user doc, write `PlanChangeRecord`, grant bonus credits if applicable |
| `cancelPlan(userId)` | Downgrade to `guest`, cancel Stripe subscription, write change record |
| `getPlanChangeHistory(userId)` | Query `planChangeHistory` collection for a user |
| `checkPlanExpiry(userId)` | For trial plans: check if expired, auto-downgrade if so |
| `checkFeatureAccess(userId, feature)` | Gate check: does the user's current plan include this feature? |
| `getProrationPreview(userId, newPlan)` | Calculate proration amount for mid-cycle upgrade/downgrade using Stripe API |

### 4.3 `pricing-service.ts` → Extend

| Method | Change |
|---|---|
| `getCreditPacks()` | **NEW** — return available credit packs from config |
| `calculateEstimate()` | **Update** — use corrected `mediaSynthesis: 0.25` and account for `imagesPerSection` |

### 4.4 `stripe-service.ts` → Major extension (see also §7 for full Stripe details)

| Method | Change |
|---|---|
| `createCheckoutSession()` | **Update** — split into two dedicated methods below, keep as thin dispatcher |
| `createCreditPackCheckout(userId, packId)` | **NEW** — `stripe.checkout.sessions.create({ mode: 'payment', metadata: { userId, packId, creditAmount } })` |
| `createPlanCheckout(userId, planId)` | **NEW** — `stripe.checkout.sessions.create({ mode: 'subscription', subscription_data: { metadata } })`. If user already has a subscription, use `stripe.subscriptions.update()` with proration instead |
| `cancelSubscription(userId)` | **NEW** — `stripe.subscriptions.cancel(subscriptionId)` → triggers `customer.subscription.deleted` webhook |
| `getProrationPreview(userId, newPriceId)` | **NEW** — `stripe.invoices.createPreview({ subscription, subscription_items, subscription_proration_date })` |
| `createPortalSession(userId)` | **KEEP** — existing Customer Portal for self-serve invoice/payment management |
| `resolveUserByCustomerId(customerId)` | **NEW** — Firestore query `users where stripeCustomerId == customerId` for webhook fallback |
| Webhook handler (`route.ts`) | **REWRITE** — see §7.4 for complete event-by-event specification |

---

## 5. API Routes

### 5.1 Credit Routes

| Route | Method | Role | Purpose |
|---|---|---|---|
| `/api/credits/transactions` | GET | `user` | Own transaction history (paginated, filtered) |
| `/api/credits/purchase` | POST | `user` | Create Stripe checkout for credit pack |
| `/api/credits/auto-refill` | PUT | `user` | Update auto-refill settings |
| `/api/admin/credits/stats` | GET | `su`, `admin` | System-wide credit stats |
| `/api/admin/credits/users` | GET | `su`, `admin` | All users with credit summaries (searchable) |
| `/api/admin/credits/users/[userId]/transactions` | GET | `su`, `admin` | Any user's transaction history |
| `/api/admin/credits/config` | GET/PUT | `su` only | Read/update `PRICING_CONFIG` |
| `/api/admin/top-up` | POST | `su`, `admin` | **Existing** — add transaction record |

### 5.2 Plan Management Routes

| Route | Method | Role | Purpose |
|---|---|---|---|
| `/api/plans` | GET | any | List all public plan definitions (for pricing page) |
| `/api/plans/current` | GET | `user` | Get current user's plan details + features + limits |
| `/api/plans/change` | POST | `user` | Initiate plan upgrade/downgrade via Stripe Checkout |
| `/api/plans/cancel` | POST | `user` | Cancel current subscription (downgrade to guest) |
| `/api/plans/proration-preview` | POST | `user` | Preview cost difference for mid-cycle plan change |
| `/api/plans/history` | GET | `user` | Own plan change history |
| `/api/admin/plans/users/[userId]/change` | POST | `su`, `admin` | Admin-override plan for any user (no Stripe needed) |
| `/api/admin/plans/users/[userId]/history` | GET | `su`, `admin` | Any user's plan change history |
| `/api/admin/plans/definitions` | GET/PUT | `su` only | Read/update plan definitions and feature sets |

---

## 6. UI Components

### 6.1 Admin — Credit Management Dashboard

```
/admin/credits/page.tsx  (NEW)
├── CreditSystemOverview.tsx       — KPI cards: total balance, spent, purchased, active users
├── CreditUsersTable.tsx           — Searchable/sortable user table with Plan column, pagination
├── CreditUserDrilldown.tsx        — Transaction + plan change history for selected user
│   └── UserPlanManager.tsx        — Change user's plan, grant trials, view plan history (admin)
├── CreditTopUp.tsx                — REFACTOR existing from /admin/tools into this dashboard
├── PlanDefinitionsEditor.tsx      — Edit plan features, limits, pricing (su-only)
├── PricingConfigEditor.tsx        — Live PRICING_CONFIG editor (su-only)
└── CreditAlerts.tsx               — Low balance / plan expiration / anomaly alerts
```

### 6.2 User — My Credits Dashboard

```
/settings/billing/page.tsx  (REWRITE — tabbed layout)
├── Tab: "My Plan"
│   ├── CurrentPlanCard.tsx        — Active plan tier, features, renewal date, multiplier
│   ├── PlanComparisonGrid.tsx     — Side-by-side plan comparison with upgrade/downgrade CTAs
│   ├── ProrationPreview.tsx       — Shows cost/credit for mid-cycle plan change before confirming
│   └── PlanChangeHistory.tsx      — Timeline of past plan changes
│
├── Tab: "Credits"
│   ├── CreditBalanceHero.tsx      — Large balance display with 7-day sparkline
│   ├── CreditPackCards.tsx        — Purchasable credit packs with Stripe checkout
│   ├── AutoRefillSettings.tsx     — Toggle + threshold + pack size config
│   └── CostEstimatorWidget.tsx    — Interactive: "How much does X cost?"
│
└── Tab: "History"
    └── TransactionHistory.tsx     — Paginated, filterable log (credits + plan changes merged)
```

### 6.3 Shared / Updated

| Component | Change |
|---|---|
| `CreditBadge.tsx` | **Update** — show balance + plan tier from real-time listener, add low-balance pulse animation |
| `CreditBalanceDashboard.tsx` | **DELETE** — replaced by `CreditBalanceHero` |
| `PricingCard.tsx` | **REPURPOSE** — use for both plan comparison AND credit packs (variant prop) |
| `ProjectCreditEstimate.tsx` | **Update** — use corrected pricing from single config source, show plan multiplier |
| `CostEstimateCard.tsx` | **Update** — use corrected pricing |

---

## 7. Stripe Integration (Detailed)

### 7.1 Stripe Product & Price Catalog

All Stripe products and prices must be created in the Stripe Dashboard (or via API seed script) **before deployment**. This is the source of truth for pricing.

#### Subscription Products (Plans)

| Stripe Product | Stripe Price ID (env var) | Mode | Interval | Amount |
|---|---|---|---|---|
| VideoSystem Standard | `STRIPE_PRICE_STANDARD` | `subscription` | monthly | $29/mo |
| VideoSystem Premium | `STRIPE_PRICE_PREMIUM` | `subscription` | monthly | $99/mo |
| VideoSystem Custom | (configured per-client) | `subscription` | monthly | custom |

> `guest` and `trial` are free tiers — no Stripe product needed. Trial is time-limited (e.g., 14 days).

#### One-Time Products (Credit Packs)

| Stripe Product | Stripe Price ID (env var) | Mode | Amount | Credits Granted |
|---|---|---|---|---|
| Credit Pack — Starter | `STRIPE_PRICE_PACK_100` | `payment` | $10 | 100 credits |
| Credit Pack — Producer | `STRIPE_PRICE_PACK_300` | `payment` | $25 | 300 credits |
| Credit Pack — Studio | `STRIPE_PRICE_PACK_750` | `payment` | $50 | 750 credits |

#### Auto-Refill Product

| Stripe Product | Stripe Price ID (env var) | Mode | Amount | Credits Granted |
|---|---|---|---|---|
| Auto-Refill Pack | `STRIPE_PRICE_AUTOREFILL` | `payment` | $10 | 100 credits |

### 7.2 Environment Variables

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Subscription Price IDs
STRIPE_PRICE_STANDARD=price_...
STRIPE_PRICE_PREMIUM=price_...

# Credit Pack Price IDs
STRIPE_PRICE_PACK_100=price_...
STRIPE_PRICE_PACK_300=price_...
STRIPE_PRICE_PACK_750=price_...

# Auto-Refill
STRIPE_PRICE_AUTOREFILL=price_...
```

### 7.3 `stripe-service.ts` — Detailed Method Specs

#### `createCreditPackCheckout(userId, packId)`
```typescript
async createCreditPackCheckout(userId: string, packId: string) {
    const pack = PRICING_CONFIG.creditPacks.find(p => p.id === packId);
    const customerId = await this.ensureStripeCustomer(userId);
    
    return stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        line_items: [{ price: pack.stripePriceId, quantity: 1 }],
        metadata: {
            userId,
            purchaseType: 'credit-pack',
            packId,
            creditAmount: String(pack.credits),
        },
        success_url: `${APP_URL}/settings/billing?tab=credits&status=success`,
        cancel_url: `${APP_URL}/settings/billing?tab=credits&status=cancel`,
    });
}
```

#### `createPlanCheckout(userId, newPlan)`
```typescript
async createPlanCheckout(userId: string, newPlan: UserPlan) {
    const user = await getUser(userId);
    const customerId = await this.ensureStripeCustomer(userId);
    const planDef = getPlanDefinition(newPlan);
    
    // If user already has an active subscription, update it (proration)
    if (user.stripeSubscriptionId && user.subscriptionStatus === 'active') {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        return stripe.subscriptions.update(user.stripeSubscriptionId, {
            items: [{
                id: subscription.items.data[0].id,
                price: planDef.stripePriceId,
            }],
            proration_behavior: 'always_invoice',  // Charge/credit difference immediately
            metadata: { userId, previousPlan: user.plan, newPlan },
        });
    }
    
    // New subscription — create checkout session
    return stripe.checkout.sessions.create({
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
}
```

#### `cancelSubscription(userId)`
```typescript
async cancelSubscription(userId: string) {
    const user = await getUser(userId);
    if (!user.stripeSubscriptionId) throw new Error('No active subscription');
    
    // Cancel at period end (grace period) or immediately
    return stripe.subscriptions.cancel(user.stripeSubscriptionId);
    // This triggers 'customer.subscription.deleted' webhook
}
```

#### `getProrationPreview(userId, newPriceId)`
```typescript
async getProrationPreview(userId: string, newPriceId: string) {
    const user = await getUser(userId);
    if (!user.stripeSubscriptionId) return null;
    
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    const preview = await stripe.invoices.createPreview({
        customer: user.stripeCustomerId,
        subscription: user.stripeSubscriptionId,
        subscription_items: [{
            id: subscription.items.data[0].id,
            price: newPriceId,
        }],
        subscription_proration_date: Math.floor(Date.now() / 1000),
    });
    
    return {
        proratedAmount: preview.total / 100,         // In dollars
        nextBillingDate: new Date(preview.period_end * 1000),
        lineItems: preview.lines.data.map(li => ({
            description: li.description,
            amount: li.amount / 100,
        })),
    };
}
```

#### `triggerAutoRefill(userId)`
```typescript
async triggerAutoRefill(userId: string) {
    const user = await getUser(userId);
    if (!user.autoRefill?.enabled || !user.stripeCustomerId) return;
    if (user.creditBalance > user.autoRefill.threshold) return;
    
    // Create a PaymentIntent for the auto-refill pack (no redirect needed)
    const paymentIntent = await stripe.paymentIntents.create({
        amount: 1000, // $10 in cents
        currency: 'usd',
        customer: user.stripeCustomerId,
        off_session: true,
        confirm: true,
        payment_method: user.stripeDefaultPaymentMethod, // Saved from previous checkout
        metadata: {
            userId,
            purchaseType: 'auto-refill',
            creditAmount: String(user.autoRefill.packSize),
        },
    });
    
    // Credits are granted via 'payment_intent.succeeded' webhook
    return paymentIntent;
}
```

### 7.4 Webhook Handler Refactor (`/api/webhooks/stripe/route.ts`)

The existing handler will be **fully rewritten** to handle all payment flows with proper transaction logging.

| Stripe Event | Current Behaviour | New Behaviour |
|---|---|---|
| `checkout.session.completed` (mode: `payment`) | Grants credits but no transaction record | **Grant credits + write `CreditTransaction` with `type: 'purchase'`** |
| `checkout.session.completed` (mode: `subscription`) | Not explicitly handled | **Update user plan + write `PlanChangeRecord` + grant bonus credits if applicable** |
| `customer.subscription.updated` | Syncs plan from priceId (hardcoded) | **Map priceId → plan via env vars, update user doc, write `PlanChangeRecord`, apply multiplier change** |
| `customer.subscription.deleted` | Sets plan to `guest` | **Set plan to `guest`, write `PlanChangeRecord` with `changeType: 'cancellation'`, clear subscription fields** |
| `invoice.payment_succeeded` | Calls stale `grantMonthlyCredits()` | **DELETE this handler** (no monthly grants in Pure Prepaid) |
| `payment_intent.succeeded` | Not handled | **NEW**: Handle auto-refill payments → grant credits + write transaction |
| `invoice.payment_failed` | Not handled | **NEW**: Log failed payment, notify user via in-app alert, flag in admin dashboard |
| `customer.subscription.trial_will_end` | Not handled | **NEW**: Send in-app notification 3 days before trial expires |

#### Price-to-Plan Mapping (replaces hardcoded logic)

```typescript
const PRICE_TO_PLAN: Record<string, UserPlan> = {
    [process.env.STRIPE_PRICE_STANDARD!]: 'standard',
    [process.env.STRIPE_PRICE_PREMIUM!]:  'premium',
};

const PRICE_TO_CREDITS: Record<string, number> = {
    [process.env.STRIPE_PRICE_PACK_100!]:    100,
    [process.env.STRIPE_PRICE_PACK_300!]:    300,
    [process.env.STRIPE_PRICE_PACK_750!]:    750,
    [process.env.STRIPE_PRICE_AUTOREFILL!]:  100,
};
```

### 7.5 Stripe Customer Portal

The existing `createPortalSession()` is preserved but the portal configuration in Stripe Dashboard must be updated to:

| Portal Feature | Enabled | Notes |
|---|---|---|
| **Invoice history** | ✅ | Users can view/download past invoices |
| **Payment method update** | ✅ | Required for auto-refill |
| **Subscription cancel** | ✅ | Mirrors our `/api/plans/cancel` route |
| **Subscription update** | ❌ | We handle plan changes in-app with proration preview |
| **Subscription pause** | ❌ | Not supported in our model |

Access from the user dashboard via a "Manage Payments" link that opens the portal in a new tab.

### 7.6 Idempotency & Error Handling

| Concern | Strategy |
|---|---|
| **Duplicate webhooks** | Check for existing `CreditTransaction` or `PlanChangeRecord` with matching Stripe session/event ID before processing. Use `metadata.stripeEventId` field. |
| **Webhook signature verification** | Already implemented — keep `stripe.webhooks.constructEvent()` |
| **Failed payments** | Write a `CreditTransaction` with `type: 'failed-payment'` for admin visibility. Do not grant credits. |
| **Partial failures** | Wrap all webhook handlers in try/catch per event. Return 200 even on processing errors (to prevent Stripe retries flooding). Log errors to Firestore `webhookErrors` collection. |
| **Race conditions** | All balance mutations use Firestore transactions (already implemented in `credit-service.ts`) |
| **Stripe test vs live** | Use `STRIPE_SECRET_KEY` prefix check (`sk_test_` vs `sk_live_`) to log environment in transactions |

### 7.7 Stripe CLI — Local Development & Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login and forward webhooks to local dev server
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger payment_intent.succeeded
stripe trigger invoice.payment_failed
```

## 8. Implementation Phases

### Phase 1 — Foundation (Completed)
- [x] 1. Stripe product/price setup
- [x] 2. Add Stripe price ID env vars to `.env.local`
- [x] 3. Create Firestore collections (`creditTransactions`, `planChangeHistory`) + rules
- [x] 4. Define `PlanDefinition` config in `pricing.ts`
- [x] 5. Rewrite `credit-service.ts` (Transaction-safe mutations)
- [x] 6. Create `plan-service.ts` (Lifecycle management)
- [x] 7. Extend `stripe-service.ts` (Checkout, Cancellation, Proration)
- [x] 8. Update User type (Prepaid model fields)

### Phase 2 — Credit API Layer (Completed)
- [x] 9. Build `/api/credits/transactions` (GET)
- [x] 10. Build `/api/credits/purchase` (POST)
- [x] 11. Build `/api/credits/auto-refill` (PUT)
- [x] 12. Build `/api/admin/credits/stats` (GET)
- [x] 13. Build `/api/admin/credits/users` (GET + transactions drilldown)
- [x] 14. Build `/api/admin/credits/config` (GET/PUT)
- [x] 15. Update `/api/admin/top-up` (Audit logging)
- [x] 16. Rewrite Stripe webhook handler for Credits & Auto-Refill

### Phase 3 — Plan API Layer (Completed)
- [x] 17. Build `/api/plans/current` (GET)
- [x] 18. Build `/api/plans/change` (POST)
- [x] 19. Build `/api/plans/cancel` (POST)
- [x] 20. Build `/api/plans/proration-preview` (POST)
- [x] 21. Build `/api/plans/history` (GET)
- [x] 22. Build `/api/admin/plans/users/[userId]/change` (POST)
- [x] 23. Build `/api/admin/plans/users/[userId]/history` (GET)
- [x] 24. Build `/api/admin/plans/definitions` (GET/PUT)
- [x] 25. Extend Stripe webhook handler for Plan lifecycle events

### Phase 4 — User Dashboard (Completed)
- [x] Build `CurrentPlanCard`, `PlanComparisonGrid`, `ProrationPreviewModal`, `PlanHistoryTab` components
- [x] Build `CreditPackCards`, `TransactionTable` components
- [x] Build `AutoRefillSettings` component
- [x] Rewrite `src/app/settings/billing/page.tsx` with tabbed layout (My Plan | Credits | History)
- [x] Update `CreditBadge` for real-time balance + plan tier + low-balance animation

### Phase 5 — Admin Dashboard (Completed)
- [x] Build `CreditSystemOverview`, `CreditUsersTable`, `CreditUserDrilldown`
- [x] Build `AdminPlanOverride` integration
- [x] Implement `/admin/credits/page.tsx` composing all admin panels
- [x] Refactor `CreditTopUp` into the new admin dashboard
- [x] Add admin nav link to Credit Management

### Phase 6 — Stripe Customer Portal & Auto-Refill
40. Configure Stripe Customer Portal (invoices, payment methods, cancel — see §7.5)
41. Add "Manage Payments" link in user dashboard that opens portal
42. Implement auto-refill trigger in `credit-service.deductCredits()` → check threshold → call `triggerAutoRefill()`
43. Add saved payment method flow (store `stripeDefaultPaymentMethod` on user doc after first checkout)

### Phase 7 — Polish & Cleanup
44. Delete deprecated components (`CreditBalanceDashboard`)
45. Remove `grantMonthlyCredits` references (including stale `invoice.payment_succeeded` handler)
46. Implement feature gating checks at key action points (render, voice clone, etc.)
47. Add idempotency checks to webhook handler (§7.6)
48. Ensure all deduction points (media, script, TTS, render) write transactions
49. End-to-end smoke test of both dashboards
50. Verify full Stripe lifecycle with Stripe CLI (§7.7)

---

## 9. Search & Summary (Admin)

| Feature | Implementation |
|---|---|
| **Full-text user search** | Client-side filter on pre-fetched user list (< 1000 users) or Firestore `where` on email prefix for scale |
| **Multi-field sort** | Client-side sort by: balance, total spent, last activity, name |
| **Date range filter** | Firestore compound query on `createdAt` for transaction history |
| **Summary cards** | Firestore `aggregate` queries (count, sum) for system-level KPIs |
| **Export** | CSV download of filtered transaction data (Phase 5 nice-to-have) |

---

## 10. Security Rules

```javascript
// creditTransactions collection
match /creditTransactions/{txId} {
  allow read: if request.auth.uid == resource.data.userId
               || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['su', 'admin']);
  allow write: if false; // Server-side only via Admin SDK
}

// planChangeHistory collection
match /planChangeHistory/{recordId} {
  allow read: if request.auth.uid == resource.data.userId
               || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['su', 'admin']);
  allow write: if false; // Server-side only via Admin SDK
}
```

---

## 11. Verification Plan

### Automated
- Run `npm run build` after each phase to confirm no type errors
- Run existing test suite if present (`npm test`)

### Manual — User Dashboard (Credits Tab)
1. Start dev server (`npm run dev`)
2. Navigate to `/settings/billing` → **Credits** tab as a non-admin user
3. Verify: balance card shows correct `creditBalance`, credit packs render, clicking a pack opens Stripe checkout, transaction history shows past deductions
4. Toggle auto-refill on/off and verify settings persist on page reload

### Manual — User Dashboard (My Plan Tab)
1. Navigate to `/settings/billing` → **My Plan** tab
2. Verify: current plan card shows correct plan tier, features, and renewal date
3. Click "Upgrade" on a higher plan → verify proration preview displays → redirect to Stripe Checkout
4. After successful checkout, verify plan is updated and `planChangeHistory` record exists
5. Click "Cancel Plan" → verify downgrade to guest after confirmation dialog

### Manual — Admin Dashboard
1. Navigate to `/admin/credits` as an `su` or `admin` user
2. Verify: system overview KPIs load, user table is searchable and sortable (includes Plan column)
3. Click a user row → verify drilldown shows their full credit transaction history AND plan change history
4. Use the top-up tool → verify transaction appears in target user's history
5. Use the plan manager to change a user's plan → verify it updates immediately and writes a change record
6. (su only) Open plan definitions editor → modify features for a plan → verify it persists
7. (su only) Open pricing config editor → change a value → verify it persists

### Manual — Cost Alignment
1. Trigger a media synthesis via the Generate Media modal
2. Verify: the cost shown in the modal matches the amount deducted from the backend
3. Check that a `creditTransaction` document was created in Firestore with the correct amount

### Manual — Plan Lifecycle (Stripe Test Mode)
1. Use Stripe test card `4242 4242 4242 4242` to purchase a `standard` plan
2. Verify: user doc updated with plan, `subscriptionStatus: 'active'`, bonus credits granted
3. Upgrade to `premium` mid-cycle → verify proration preview shows correct $ amount → confirm → verify invoice
4. Cancel subscription → verify downgrade to `guest` and `subscriptionStatus: 'canceled'`
5. Check `planChangeHistory` has records for each step

### Manual — Stripe Webhook Testing (via CLI)
1. Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
2. Trigger `stripe trigger checkout.session.completed` → verify credit transaction created
3. Trigger `stripe trigger customer.subscription.updated` → verify plan change record created
4. Trigger `stripe trigger customer.subscription.deleted` → verify user downgraded to `guest`
5. Trigger `stripe trigger payment_intent.succeeded` → verify auto-refill credits granted
6. Trigger `stripe trigger invoice.payment_failed` → verify alert appears in admin dashboard
7. Send duplicate event → verify idempotency guard prevents double-processing

### Manual — Customer Portal
1. From `/settings/billing`, click "Manage Payments"
2. Verify: Stripe Customer Portal opens, shows invoice history and payment method update
3. Update payment method in portal → verify new method saved (for auto-refill)

### Manual — Auto-Refill
1. Enable auto-refill with threshold = 5, pack size = 100
2. Perform actions until balance drops below 5
3. Verify: auto-refill triggers, credits added, `CreditTransaction` with `type: 'purchase'` and `metadata.autoRefill: true` created

---

> **Next step:** Review and approve this plan, then we proceed to Phase 1 implementation.
