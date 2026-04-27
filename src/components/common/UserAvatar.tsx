'use client';

import React from 'react';
import { User } from '@/types';

interface UserAvatarProps {
    user: Partial<User> | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
};

export function UserAvatar({ user, size = 'sm', className = '' }: UserAvatarProps) {
    const [imageError, setImageError] = React.useState(false);

    if (!user) {
        return (
            <div 
                className={`${sizeClasses[size]} rounded-full bg-gray-800 border border-gray-700 animate-pulse ${className}`}
            />
        );
    }

    const { photoURL, displayName, email } = user;
    
    // Robust initials generation
    const sourceString = (displayName || email || '?').trim();
    const initials = sourceString
        .split(/\s+/)
        .filter(n => n.length > 0)
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2) || '?';

    // Generate a consistent gradient based on the user's name/email
    const getGradient = (seed: string) => {
        const colors = [
            'from-blue-500 to-indigo-600',
            'from-purple-500 to-pink-600',
            'from-emerald-500 to-teal-600',
            'from-orange-500 to-red-600',
            'from-cyan-500 to-blue-600',
        ];
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const gradientClass = getGradient(displayName || email || 'default');

    // Render photo if available AND not error
    if (photoURL && !imageError) {
        return (
            <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border border-white/10 shadow-inner group-hover:scale-105 transition-transform ${className}`}>
                <img
                    src={photoURL}
                    alt={displayName || 'User profile'}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                />
            </div>
        );
    }

    // Fallback to stylized initials
    return (
        <div className={`flex items-center justify-center rounded-full bg-gradient-to-br ${gradientClass} border border-white/20 shadow-lg ${sizeClasses[size]} hover:brightness-110 transition-all ${className}`}>
            <span className="font-bold text-white tracking-tighter drop-shadow-sm select-none">
                {initials}
            </span>
        </div>
    );
}
