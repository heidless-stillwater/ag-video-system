import { db } from '../firebase-admin';
import { User, UserPlan, CreditTransaction } from '@/types';

/**
 * Service to manage user credits and subscription-based allocations.
 * Implements the Pure Prepaid model with full transaction logging.
 */
export const creditService = {
    /**
     * Safe credit deduction using transaction to prevent race conditions.
     * Automatically logs a 'deduction' CreditTransaction.
     */
    async deductCredits(userId: string, amount: number, action?: string, projectId?: string, metadata?: Record<string, any>) {
        if (amount <= 0) return;
        
        const userRef = db.collection('users').doc(userId);
        const txRef = db.collection('creditTransactions').doc();
        
        return await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error('User not found');
            }
            
            const userData = userDoc.data() as User;
            const currentBalance = userData.creditBalance || 0;
            
            if (currentBalance < amount) {
                throw new Error(`Insufficient credits. Required: ${amount}, available: ${currentBalance}`);
            }
            
            const newBalance = currentBalance - amount;
            
            // 1. Update user balance
            transaction.update(userRef, {
                creditBalance: newBalance,
                updatedAt: new Date(),
            });
            
            // 2. Log transaction
            const creditTx: CreditTransaction = {
                id: txRef.id,
                userId,
                type: 'deduction',
                amount,
                balanceAfter: newBalance,
                action,
                projectId,
                metadata,
                createdAt: new Date(),
            };
            transaction.set(txRef, creditTx);
            
            return newBalance;
        });
    },

    /**
     * Add credits to user balance (e.g., from top-up purchase).
     * Automatically logs a 'purchase' or 'grant' CreditTransaction.
     */
    async addCredits(userId: string, amount: number, type: 'purchase' | 'grant' | 'admin-topup' | 'plan-bonus' = 'purchase', metadata?: Record<string, any>) {
        if (amount <= 0) return;
        
        const userRef = db.collection('users').doc(userId);
        const txRef = db.collection('creditTransactions').doc();
        
        return await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error('User not found');
            }
            
            const userData = userDoc.data() as User;
            const currentBalance = userData.creditBalance || 0;
            const newBalance = currentBalance + amount;
            
            // 1. Update user balance
            transaction.update(userRef, {
                creditBalance: newBalance,
                updatedAt: new Date(),
            });
            
            // 2. Log transaction
            const creditTx: CreditTransaction = {
                id: txRef.id,
                userId,
                type,
                amount,
                balanceAfter: newBalance,
                metadata,
                createdAt: new Date(),
            };
            transaction.set(txRef, creditTx);
            
            return newBalance;
        });
    },

    /**
     * Get paginated transaction history for a user.
     */
    async getTransactionHistory(userId: string, limit: number = 20, offset: number = 0) {
        const snapshot = await db.collection('creditTransactions')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            // .offset(offset) // Note: use lastDoc for better performance on large sets
            .get();
            
        return snapshot.docs.map(doc => doc.data() as CreditTransaction);
    },

    /**
     * Get aggregate system stats for the admin dashboard.
     */
    async getSystemStats() {
        // In production, these should be cached or use Firestore aggregation for cost-efficiency
        const usersSnapshot = await db.collection('users').select('creditBalance').get();
        const txSnapshot = await db.collection('creditTransactions').where('type', '==', 'deduction').get();
        
        const totalCirculating = usersSnapshot.docs.reduce((acc, doc) => acc + (doc.data().creditBalance || 0), 0);
        const totalSpentAllTime = txSnapshot.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
        
        return {
            totalUsers: usersSnapshot.size,
            totalCreditsInCirculation: totalCirculating,
            totalCreditsSpentAllTime: totalSpentAllTime,
            timestamp: new Date()
        };
    },

    /**
     * Get paginated user summaries with credit stats for admin dashboard.
     */
    async getUserSummaries(limit: number = 50) {
        const snapshot = await db.collection('users')
            .orderBy('creditBalance', 'desc')
            .limit(limit)
            .get();
            
        return snapshot.docs.map(doc => {
            const data = doc.data() as User;
            return {
                id: doc.id,
                email: data.email,
                displayName: data.displayName,
                plan: data.plan,
                creditBalance: data.creditBalance,
                photoURL: data.photoURL
            };
        });
    },

    /**
     * Synchronize a user's subscription status from Stripe events.
     */
    async syncSubscription(userId: string, subscriptionId: string, status: string, plan: UserPlan) {
        const userRef = db.collection('users').doc(userId);
        
        await userRef.update({
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: status,
            plan: plan,
            updatedAt: new Date(),
        });
    }
};
