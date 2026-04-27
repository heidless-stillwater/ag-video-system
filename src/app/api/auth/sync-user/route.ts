import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/roleMiddleware';
import { db, identityDb } from '@/lib/firebase-admin';
import { User, UserRole, UserPlan } from '@/types';

/**
 * POST /api/auth/sync-user
 * 
 * SOVEREIGN IDENTITY SYNC (VideoSystem Node)
 * 
 * 1. Probes prompttool-db-0 (Identity Hub) for suite-wide profile/roles.
 * 2. Merges identity data into autovideo-db-0 (Local App Store).
 * 3. Normalizes roles and subscriptions to ensure suite-wide consistency.
 */
export async function POST(request: NextRequest) {
    try {
        const ctx = await verifyAuth(request);
        if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { userId, email } = ctx;

        // 1. Fetch from Identity Hub (PromptTool)
        const identitySnap = await identityDb.collection('users').doc(userId).get();
        const identityData = identitySnap.exists ? identitySnap.data() : null;

        // 2. Fetch from Local Store (VideoSystem)
        const localSnap = await db.collection('users').doc(userId).get();
        const localData = localSnap.exists ? localSnap.data() as User : null;

        // 3. Resolve Identity & Roles
        // We trust the Identity Hub for core roles, but VideoSystem might have elevated local roles.
        let finalRoles: UserRole[] = localData?.roles || ['user'];
        
        if (identityData) {
            // Map Identity Hub roles ('su', 'admin', 'member') to VideoSystem roles ('su', 'admin', 'user')
            const idRole = identityData.role || identityData.actingAs;
            if (idRole === 'su') finalRoles = ['su', 'admin'];
            else if (idRole === 'admin' && !finalRoles.includes('admin')) finalRoles = ['admin'];
            
            // Sync subscription status if available
            // Note: VideoSystem uses its own Plan types, but we can map 'pro' status.
        }

        // 4. Update Local Store
        const now = new Date();
        const updatedUser: Partial<User> = {
            id: userId,
            email: email || localData?.email || identityData?.email || '',
            displayName: localData?.displayName || identityData?.displayName || identityData?.username || 'Sovereign User',
            photoURL: localData?.photoURL || identityData?.photoURL || null,
            roles: finalRoles,
            updatedAt: now,
        };

        // Initialize new user if they don't exist locally
        if (!localData) {
            const newUser: User = {
                ...updatedUser as User,
                createdAt: now,
                plan: 'standard', // Default for new suite members in this app
                creditBalance: 10,  // Welcome bonus
                settings: {
                    defaultMode: 'DEV',
                    notifications: true,
                    autoSave: true,
                    youtubeConnected: false
                }
            };
            await db.collection('users').doc(userId).set(newUser);
        } else {
            await db.collection('users').doc(userId).update(updatedUser);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Identity synchronized with Stillwater Hub',
            roles: finalRoles 
        });

    } catch (error: any) {
        console.error('[sync-user] Sovereign Sync Failure:', error);
        return NextResponse.json({ error: 'Internal server error during identity sync' }, { status: 500 });
    }
}
