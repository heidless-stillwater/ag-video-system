import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { withAuth } from '@/lib/auth/roleMiddleware';

/**
 * GET /api/profile
 * Get current user's profile
 */
export const GET = withAuth(async (request, context) => {
    try {
        const { userId } = context;

        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        const userData = userDoc.data();

        return NextResponse.json({
            success: true,
            user: {
                id: userDoc.id,
                ...userData
            }
        });

    } catch (error: any) {
        console.error('[Profile API] Error getting profile:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});

/**
 * PUT /api/profile
 * Update current user's profile (display name, settings)
 * NOTE: Roles and Plan cannot be updated here
 */
export const PUT = withAuth(async (request, context) => {
    try {
        const { userId } = context;
        const body = await request.json();
        const { displayName, settings } = body;

        const updateData: any = {
            updatedAt: new Date()
        };

        if (displayName) updateData.displayName = displayName.trim();
        if (settings) updateData.settings = settings;

        // Prevent updating sensitive fields
        if (body.roles || body.plan || body.id || body.email) {
            console.warn(`[Profile API] User ${userId} attempted to update restricted fields`);
        }

        await db.collection('users').doc(userId).update(updateData);

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error: any) {
        console.error('[Profile API] Error updating profile:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});
