'use server';

/**
 * Role Service - Manages user roles and plans
 * 
 * Roles: su (super-user), admin, user
 * Plans: guest, trial, standard, premium, custom
 */

import { db } from '@/lib/firebase-admin';
import { UserRole, UserPlan, PlanNickname, DEFAULT_PLAN_NICKNAMES } from '@/types';

const USERS_COLLECTION = 'users';
const NICKNAMES_COLLECTION = 'planNicknames';

// Initial user email for role seeding
const INITIAL_ADMIN_EMAIL = 'heidlessemail18@gmail.com';

// ===== Role Management =====

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
    try {
        const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
        if (!userDoc.exists) {
            return ['user']; // Default role
        }
        const data = userDoc.data();
        return data?.roles || ['user'];
    } catch (error) {
        console.error('[RoleService] Error getting user roles:', error);
        return ['user'];
    }
}

/**
 * Check if a user has a specific role
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
    const roles = await getUserRoles(userId);
    return roles.includes(role);
}

/**
 * Check if user has admin access (su or admin role)
 */
export async function canAccessAdmin(userId: string): Promise<boolean> {
    const roles = await getUserRoles(userId);
    return roles.includes('su') || roles.includes('admin');
}

/**
 * Check if user is super-user
 */
export async function isSuperUser(userId: string): Promise<boolean> {
    return hasRole(userId, 'su');
}

/**
 * Assign a role to a user
 * Enforces uniqueness for 'su' and 'admin' roles
 */
export async function assignRole(userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> {
    try {
        // For su and admin, check if already assigned to another user
        if (role === 'su' || role === 'admin') {
            const existingHolder = await findUserWithRole(role);
            if (existingHolder && existingHolder.id !== userId) {
                return {
                    success: false,
                    error: `Role '${role}' is already assigned to user ${existingHolder.email}. Remove it first.`
                };
            }
        }

        const userRef = db.collection(USERS_COLLECTION).doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return { success: false, error: 'User not found' };
        }

        const currentRoles: UserRole[] = userDoc.data()?.roles || ['user'];

        if (currentRoles.includes(role)) {
            return { success: true }; // Already has role
        }

        await userRef.update({
            roles: [...currentRoles, role]
        });

        console.log(`[RoleService] Assigned role '${role}' to user ${userId}`);
        return { success: true };
    } catch (error: any) {
        console.error('[RoleService] Error assigning role:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Remove a role from a user
 */
export async function removeRole(userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> {
    try {
        const userRef = db.collection(USERS_COLLECTION).doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return { success: false, error: 'User not found' };
        }

        const currentRoles: UserRole[] = userDoc.data()?.roles || [];
        const newRoles = currentRoles.filter(r => r !== role);

        // Ensure at least 'user' role remains
        if (newRoles.length === 0) {
            newRoles.push('user');
        }

        await userRef.update({ roles: newRoles });

        console.log(`[RoleService] Removed role '${role}' from user ${userId}`);
        return { success: true };
    } catch (error: any) {
        console.error('[RoleService] Error removing role:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Find the user who currently holds a specific unique role (su or admin)
 */
export async function findUserWithRole(role: UserRole): Promise<{ id: string; email: string } | null> {
    try {
        const snapshot = await db.collection(USERS_COLLECTION)
            .where('roles', 'array-contains', role)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return { id: doc.id, email: doc.data().email };
    } catch (error) {
        console.error('[RoleService] Error finding user with role:', error);
        return null;
    }
}

// ===== Plan Management =====

/**
 * Get user's current plan
 */
export async function getUserPlan(userId: string): Promise<UserPlan> {
    try {
        const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
        if (!userDoc.exists) {
            return 'standard'; // Default plan
        }
        return userDoc.data()?.plan || 'standard';
    } catch (error) {
        console.error('[RoleService] Error getting user plan:', error);
        return 'standard';
    }
}

/**
 * Update user's plan
 */
export async function updateUserPlan(userId: string, plan: UserPlan): Promise<{ success: boolean; error?: string }> {
    try {
        await db.collection(USERS_COLLECTION).doc(userId).update({
            plan,
            planNickname: null // Reset custom nickname, will use default
        });

        console.log(`[RoleService] Updated plan for user ${userId} to '${plan}'`);
        return { success: true };
    } catch (error: any) {
        console.error('[RoleService] Error updating user plan:', error);
        return { success: false, error: error.message };
    }
}

// ===== Nickname Management =====

/**
 * Get nickname for a plan (custom or default)
 */
export async function getPlanNickname(plan: UserPlan): Promise<string> {
    try {
        const nicknameDoc = await db.collection(NICKNAMES_COLLECTION).doc(plan).get();
        if (nicknameDoc.exists) {
            return nicknameDoc.data()?.nickname || DEFAULT_PLAN_NICKNAMES[plan];
        }
        return DEFAULT_PLAN_NICKNAMES[plan];
    } catch (error) {
        console.error('[RoleService] Error getting plan nickname:', error);
        return DEFAULT_PLAN_NICKNAMES[plan];
    }
}

/**
 * Get all plan nicknames (merges custom with defaults)
 */
export async function getAllPlanNicknames(): Promise<PlanNickname[]> {
    try {
        const snapshot = await db.collection(NICKNAMES_COLLECTION).get();
        const customNicknames: Record<string, string> = {};

        snapshot.docs.forEach((doc: any) => {
            customNicknames[doc.id] = doc.data().nickname;
        });

        const plans: UserPlan[] = ['guest', 'trial', 'standard', 'premium', 'custom'];

        return plans.map(plan => ({
            id: plan,
            plan,
            nickname: customNicknames[plan] || DEFAULT_PLAN_NICKNAMES[plan],
            isDefault: !customNicknames[plan],
            updatedAt: new Date()
        }));
    } catch (error) {
        console.error('[RoleService] Error getting all nicknames:', error);
        // Return defaults on error
        return Object.entries(DEFAULT_PLAN_NICKNAMES).map(([plan, nickname]) => ({
            id: plan,
            plan: plan as UserPlan,
            nickname,
            isDefault: true,
            updatedAt: new Date()
        }));
    }
}

/**
 * Update a plan's nickname
 */
export async function updatePlanNickname(
    plan: UserPlan,
    nickname: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await db.collection(NICKNAMES_COLLECTION).doc(plan).set({
            plan,
            nickname,
            updatedAt: new Date()
        });

        console.log(`[RoleService] Updated nickname for plan '${plan}' to '${nickname}'`);
        return { success: true };
    } catch (error: any) {
        console.error('[RoleService] Error updating nickname:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reset a plan's nickname to default
 */
export async function resetPlanNickname(plan: UserPlan): Promise<{ success: boolean; error?: string }> {
    try {
        await db.collection(NICKNAMES_COLLECTION).doc(plan).delete();
        console.log(`[RoleService] Reset nickname for plan '${plan}' to default`);
        return { success: true };
    } catch (error: any) {
        console.error('[RoleService] Error resetting nickname:', error);
        return { success: false, error: error.message };
    }
}

// ===== User Queries =====

/**
 * Get all users (admin/su only)
 */
export async function getAllUsers(): Promise<Array<{
    id: string;
    email: string;
    displayName: string;
    roles: UserRole[];
    plan: UserPlan;
    photoURL?: string;
}>> {
    try {
        const snapshot = await db.collection(USERS_COLLECTION).get();

        return snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
                id: doc.id,
                email: data.email,
                displayName: data.displayName || 'Anonymous',
                roles: data.roles || ['user'],
                plan: data.plan || 'standard',
                creditBalance: data.creditBalance || 0,
                stripeSubscriptionId: data.stripeSubscriptionId,
                subscriptionStatus: data.subscriptionStatus,
                photoURL: data.photoURL
            };
        });
    } catch (error) {
        console.error('[RoleService] Error getting all users:', error);
        return [];
    }
}

/**
 * Get a specific user by ID
 */
export async function getUserById(userId: string): Promise<{
    id: string;
    email: string;
    displayName: string;
    roles: UserRole[];
    plan: UserPlan;
    photoURL?: string;
} | null> {
    try {
        const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
        if (!userDoc.exists) {
            return null;
        }

        const data = userDoc.data()!;
        return {
            id: userDoc.id,
            email: data.email,
            displayName: data.displayName || 'Anonymous',
            roles: data.roles || ['user'],
            plan: data.plan || 'standard',
            photoURL: data.photoURL
        };
    } catch (error) {
        console.error('[RoleService] Error getting user by ID:', error);
        return null;
    }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
    try {
        const snapshot = await db.collection(USERS_COLLECTION)
            .where('email', '==', email)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return { id: doc.id, email: doc.data().email };
    } catch (error) {
        console.error('[RoleService] Error getting user by email:', error);
        return null;
    }
}
