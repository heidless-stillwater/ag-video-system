# COST_TEST_PLAN_0 — Manual Verification Protocol

This document provides a structured protocol for verifying the **Pure Prepaid billing model** refactored in `COSTING__PLAN_0.md`.

---

## 🛠️ Prerequisites
- [x] Run the development server: `npm run dev`
- [x] Ensure Stripe Price IDs are populated in `.env.local` (Test IDs are fine)
- [x] Have the Stripe CLI running for webhook forwarding: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] Access as a `user` and an `su`/`admin` account.

---

## 📋 Test Suite 1: User Dashboard (My Credits Hub)

### 1.1 UI Integrity & Navigation
1.  Navigate to **`/settings/billing`**.
2.  **Verify**: Page defaults to the **"My Plan"** tab.
3.  **Verify**: Global navbar `CreditBadge` shows correct balance and plan nickname.
4.  **Action**: Cycle through the "My Plan", "Credits", and "History" tabs.
5.  **Verify**: Each tab loads without a full page refresh.

### 1.2 Multi-Tier Plan Management
1.  In the **"My Plan"** tab, find an upgrade tier (e.g., Semi-Pro).
2.  **Action**: Click "Upgrade".
3.  **Verify**: A **Proration Preview Modal** appears showing immediate charge vs future cycle costs.
4.  **Action**: Click "Abort" to ensure the modal closes correctly.
5.  **Action**: Click "Upgrade" again, then "Commit Change".
6.  **Verify**: Redirect to Stripe Checkout with the correct `priceId` in the URL.

### 1.3 One-Time Credit Packs
1.  Switch to the **"Credits"** tab.
2.  **Action**: Click "Acquire Credits" on the "Popular" (300cr) pack.
3.  **Verify**: Immediate redirect to Stripe Checkout for a one-time payment.
4.  **Verify**: After a successful test payment (if you complete it), you are returned to `/settings/billing?tab=credits&status=success`.

### 1.4 Dynamic Auto-Refill
1.  In the **"Credits"** tab, locate **"Auto-Refill Configuration"**.
2.  **Action**: Toggle the switch to `ON`.
3.  **Action**: Adjust the threshold slider to `50` and the pack size to `300`.
4.  **Action**: Click "Persist Strategy".
5.  **Verify**: A success notification appears. Refresh the page to ensure settings stuck.

---

## 📋 Test Suite 2: Admin Dashboard (Personnel Management)

### 2.1 System Oversight
1.  Navigate to **`/admin/credits`**.
2.  **Verify**: The **System-Wide Metrics** panel shows cards for Crediting, Tiers, and Revenue.
3.  **Verify**: The values roughly match the total aggregate of your user list.

### 2.2 Personnel Registry & Search
1.  Locate the **"Personnel Liquidity Registry"**.
2.  **Action**: Type a user's name or email into the search bar.
3.  **Verify**: The table filters in real-time.
4.  **Verify**: The role badges (`Standard`, `Premium`) and Credit balances are accurate.

### 2.3 Subject Drilldown & Injection
1.  **Action**: Click on a user row in the table.
2.  **Verify**: The **Drilldown Drawer** slides in from the right.
3.  **Action**: Use the **"Strategic Liquidity Injection"** (Top-Up) slider to add `500` credits.
4.  **Action**: Click "Execute Injection".
5.  **Verify**: The user's balance updates in the drawer AND the main table history.

### 2.4 Strategic Tier Override
1.  In the same drawer, find **"Strategic Tier Override"**.
2.  **Action**: Select a different plan tier (e.g., `Premium`).
3.  **Action**: Enter a reason: "Strategic alignment for testing".
4.  **Action**: Click "Initiate Override".
5.  **Verify**: The user's tier badge updates, and a `Plan Change History` record appears below.

---

## 📋 Test Suite 3: Auditing & Lifecycle

### 3.1 Transaction Forensics
1.  Perform any purchase or deduction (or a manual top-up).
2.  Navigate back to **`/settings/billing"** → **"History"** tab.
3.  **Verify**: A new line item exists with the correct `type` (e.g., `purchase`, `admin-topup`), `amount`, and `balanceAfter`.

### 3.2 Webhook Verification (Developer Only)
1.  With Stripe CLI active, trigger a fake success: `stripe trigger checkout.session.completed`
2.  **Verify**: The backend logs show the user resolution process.
3.  **Verify**: A transaction is logged in the user's history without manual UI interaction.

---

## 🏁 Sign-Off Criteria
- [ ] No hardcoded plan names in UI (all fetched from definitions).
- [ ] No credit balance discrepancies between Header, Settings, and Admin table.
- [ ] Proration preview accurately reflects mid-cycle cost before Stripe redirect.
- [ ] Admin overrides successfully bypass Stripe for manual adjustments.
