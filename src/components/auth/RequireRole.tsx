'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { UserRole } from '@/types';

interface RequireRoleProps {
    /** Roles that can see the content */
    roles: UserRole[];
    /** Whether ANY of the roles is sufficient (OR) or ALL roles are required (AND) */
    mode?: 'any' | 'all';
    /** Children to render if access is granted */
    children: React.ReactNode;
    /** Optional fallback content if access is denied (defaults to nothing) */
    fallback?: React.ReactNode;
}

/**
 * Conditional rendering component based on user roles.
 * Renders children only if the user has the required role(s).
 * Unlike RoleGuard, this doesn't show an access denied page - it just hides the content.
 * 
 * @example
 * // Show delete button only for admins
 * <RequireRole roles={['admin', 'su']}>
 *   <button>Delete All</button>
 * </RequireRole>
 * 
 * @example
 * // Show different content based on role
 * <RequireRole roles={['admin']} fallback={<span>View Only</span>}>
 *   <button>Edit</button>
 * </RequireRole>
 */
export function RequireRole({
    roles,
    mode = 'any',
    children,
    fallback = null
}: RequireRoleProps) {
    const { user, loading, hasRole } = useAuth();

    // Don't render anything while loading
    if (loading) {
        return null;
    }

    // No user = no access
    if (!user) {
        return <>{fallback}</>;
    }

    const hasAccess = mode === 'any'
        ? roles.some(role => hasRole(role))
        : roles.every(role => hasRole(role));

    if (!hasAccess) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

export default RequireRole;
