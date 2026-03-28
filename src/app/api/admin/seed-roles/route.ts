import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { UserRole, UserPlan } from '@/types';

const INITIAL_ADMIN_EMAIL = 'heidlessemail18@gmail.com';

/**
 * POST /api/admin/seed-roles
 * One-time API to seed initial roles for the designated admin user.
 * Assigns su, admin, and user roles with standard plan.
 */
export async function POST(request: NextRequest) {
    try {
        console.log('[SeedRoles] Starting role seed for:', INITIAL_ADMIN_EMAIL);

        // Find user by email
        const usersSnapshot = await db.collection('users')
            .where('email', '==', INITIAL_ADMIN_EMAIL)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            return NextResponse.json({
                success: false,
                error: `User with email ${INITIAL_ADMIN_EMAIL} not found. Please log in first to create the account.`
            }, { status: 404 });
        }

        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;
        const existingData = userDoc.data();

        // Check if roles already assigned
        const currentRoles: UserRole[] = existingData.roles || [];
        if (currentRoles.includes('su') && currentRoles.includes('admin')) {
            return NextResponse.json({
                success: true,
                message: 'Roles already seeded',
                userId,
                roles: currentRoles,
                plan: existingData.plan || 'standard'
            });
        }

        // Assign all roles
        const newRoles: UserRole[] = ['su', 'admin', 'user'];
        const newPlan: UserPlan = 'standard';

        await db.collection('users').doc(userId).update({
            roles: newRoles,
            plan: newPlan
        });

        console.log(`[SeedRoles] ✅ Assigned roles ${newRoles.join(', ')} to user ${userId}`);

        return NextResponse.json({
            success: true,
            message: 'Roles seeded successfully',
            userId,
            email: INITIAL_ADMIN_EMAIL,
            roles: newRoles,
            plan: newPlan
        });

    } catch (error: any) {
        console.error('[SeedRoles] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

/**
 * GET /api/admin/seed-roles
 * Check current seed status
 */
export async function GET() {
    try {
        // Find user by email
        const usersSnapshot = await db.collection('users')
            .where('email', '==', INITIAL_ADMIN_EMAIL)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            return NextResponse.json({
                seeded: false,
                message: `User ${INITIAL_ADMIN_EMAIL} not found. Log in first.`
            });
        }

        const userDoc = usersSnapshot.docs[0];
        const data = userDoc.data();

        return NextResponse.json({
            seeded: data.roles?.includes('su') && data.roles?.includes('admin'),
            userId: userDoc.id,
            email: data.email,
            roles: data.roles || [],
            plan: data.plan || 'standard'
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
