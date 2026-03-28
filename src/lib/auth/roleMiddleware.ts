import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { UserRole } from '@/types';

export interface AuthenticatedContext {
    userId: string;
    email?: string;
    roles?: UserRole[];
}

/**
 * Verify that the request has a valid Bearer token.
 * Returns the user ID if successful, or null if unauthorized.
 * Note: This doesn't return a response directly to allow flexible usage.
 */
export async function verifyAuth(request: NextRequest): Promise<AuthenticatedContext | null> {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.split('Bearer ')[1];
        
        // Handle mock authentication for development/testing
        if (token === 'mock-token' && process.env.NEXT_PUBLIC_ENABLE_MOCK_LOGIN === 'true') {
            return {
                userId: 'mock-user-123',
                email: 'director@heidless-ai.test'
            };
        }

        const decodedToken = await auth.verifyIdToken(token);

        return {
            userId: decodedToken.uid,
            email: decodedToken.email
        };
    } catch (error) {
        console.error('[AuthMiddleware] Verification failed:', error);
        return null;
    }
}

/**
 * Higher-order function to protect API routes with authentication checks.
 * Also fetches user roles for optional role-based logic within the handler.
 */
export function withAuth(
    handler: (request: NextRequest, context: any) => Promise<NextResponse>
) {
    return async (request: NextRequest, context: any) => {
        try {
            const authContext = await verifyAuth(request);

            if (!authContext) {
                return NextResponse.json(
                    { success: false, error: 'Unauthorized: Invalid or missing token' },
                    { status: 401 }
                );
            }

            // Fetch roles to include in context for optional role-based logic
            try {
                const userDoc = await db.collection('users').doc(authContext.userId).get();
                const roles = userDoc.exists ? (userDoc.data()?.roles || ['user']) : ['user'];
                return await handler(request, { ...context, ...authContext, roles });
            } catch (error) {
                console.error('[AuthMiddleware] Error fetching roles:', error);
                // Continue without roles if fetch fails
                return await handler(request, { ...context, ...authContext, roles: [] });
            }
        } catch (error: any) {
            console.error('[AuthMiddleware] Critical Error:', error);
            return NextResponse.json({ success: false, error: 'Internal Auth Error: ' + error.message }, { status: 500 });
        }
    };
}

/**
 * Higher-order function to protect API routes with Role-Based Access Control.
 */
export function withRole(
    allowedRoles: UserRole[],
    handler: (request: NextRequest, context: any) => Promise<NextResponse>
) {
    return async (request: NextRequest, context: any) => {
        try {
            const authContext = await verifyAuth(request);

            if (!authContext) {
                return NextResponse.json(
                    { success: false, error: 'Unauthorized: Invalid or missing token' },
                    { status: 401 }
                );
            }

            let userRoles = ['user'];
            
            if (authContext.userId === 'mock-user-123' && process.env.NEXT_PUBLIC_ENABLE_MOCK_LOGIN === 'true') {
                userRoles = ['su', 'admin', 'user']; // Mock user gets all roles
            } else {
                const userDoc = await db.collection('users').doc(authContext.userId).get();
                userRoles = userDoc.exists ? (userDoc.data()?.roles || ['user']) : ['user'];
            }

            const hasAccess = allowedRoles.some(role => userRoles.includes(role));

            if (!hasAccess) {
                console.warn(`[RoleMiddleware] Access denied for user ${authContext.userId}. Required: [${allowedRoles}], Has: [${userRoles}]`);
                return NextResponse.json(
                    { success: false, error: 'Forbidden: Insufficient permissions' },
                    { status: 403 }
                );
            }

            return await handler(request, { ...context, ...authContext });
        } catch (error: any) {
            console.error('[RoleMiddleware] Error checking roles:', error);
            return NextResponse.json(
                { success: false, error: 'Internal Role Error: ' + error.message },
                { status: 500 }
            );
        }
    };
}
