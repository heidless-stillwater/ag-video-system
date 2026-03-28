/**
 * POST /api/auth/sync-user
 *
 * Called after a user signs in to video-system.
 * Checks if a matching profile exists in prompttool-db-0 and creates one if not.
 *
 * Role Mapping (per design spec):
 *   video-system 'su'    → promptTool 'su'
 *   video-system 'admin' → promptTool 'admin'
 *   video-system 'user'  → promptTool 'member' (default)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/roleMiddleware';
import { db } from '@/lib/firebase-admin';
import { promptToolDb } from '@/lib/firebase-prompttool-db';

// Role mapping: video-system → promptTool
function mapRoleToPromptTool(roles: string[]): string {
    if (roles.includes('su')) return 'su';
    if (roles.includes('admin')) return 'admin';
    return 'member';
}

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate the calling user
        const ctx = await verifyAuth(request);
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId } = ctx;

        // 2. Fetch the user's full profile from video-system (autovideo-db-0)
        const vsUserRef = db.collection('users').doc(userId);
        const vsUserSnap = await vsUserRef.get();

        if (!vsUserSnap.exists) {
            return NextResponse.json(
                { error: 'User profile not found in video-system.' },
                { status: 404 }
            );
        }

        const vsUser = vsUserSnap.data()!;

        // 3. Check if the user already exists in prompttool-db-0
        const ptUserRef = promptToolDb.collection('users').doc(userId);
        const ptUserSnap = await ptUserRef.get();

        if (ptUserSnap.exists) {
            // User already synced — nothing to do
            return NextResponse.json(
                { message: 'User already synced.', synced: false },
                { status: 200 }
            );
        }

        // 4. Map video-system role → promptTool role
        const vsRoles: string[] = vsUser.roles || ['user'];
        const ptRole = mapRoleToPromptTool(vsRoles);

        // 5. Create the PromptTool user profile
        const ptUserProfile = {
            uid: userId,
            email: vsUser.email || ctx.email || '',
            displayName: vsUser.displayName || '',
            photoURL: vsUser.photoURL || null,
            role: ptRole,
            plan: 'trial', // Default plan; PromptTool admins can upgrade
            creditBalance: 0,
            createdAt: new Date(),
            syncedFrom: 'video-system',
            syncedAt: new Date(),
        };

        await ptUserRef.set(ptUserProfile);

        console.log(`[sync-user] Created PromptTool profile for uid: ${userId} with role: ${ptRole}`);

        return NextResponse.json(
            { message: 'User synced to PromptTool successfully.', synced: true, role: ptRole },
            { status: 201 }
        );

    } catch (error: any) {
        console.error('[sync-user] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error during user sync.' },
            { status: 500 }
        );
    }
}
