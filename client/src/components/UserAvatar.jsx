import React from 'react';

/**
 * Static corporate UserAvatar component for Discipl.
 * Renders consistent static SVG initials or static data URI.
 */
export default function UserAvatar({
  name = 'User',
  avatar,
  role = 'employee',
  size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl'
  className = '',
  statusIndicator = false,
}) {
  const getInitials = (str) => {
    if (!str) return 'U';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getRoleGradient = (userRole) => {
    switch (userRole) {
      case 'founder':
        return 'from-purple-600 to-indigo-600 text-white';
      case 'team_lead':
        return 'from-blue-600 to-cyan-600 text-white';
      case 'employee':
      default:
        return 'from-emerald-600 to-teal-600 text-white';
    }
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] rounded-lg',
    sm: 'w-7 h-7 text-xs rounded-xl',
    md: 'w-9 h-9 text-xs rounded-xl',
    lg: 'w-11 h-11 text-sm rounded-2xl',
    xl: 'w-14 h-14 text-base rounded-2xl',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;
  const isSvgDataUri = avatar && avatar.startsWith('data:image/svg+xml');

  return (
    <div className={`relative shrink-0 inline-flex items-center justify-center font-bold select-none ${className}`}>
      {avatar && !avatar.includes('unsplash.com') ? (
        <img
          src={avatar}
          alt={name}
          className={`${currentSizeClass} object-cover ring-2 ring-white/80 shadow-2xs`}
          onError={(e) => {
            // If image fails, hide it and fallback to initials
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${currentSizeClass} bg-gradient-to-tr ${getRoleGradient(
            role
          )} flex items-center justify-center font-bold tracking-tight ring-2 ring-white/80 shadow-2xs`}
        >
          {getInitials(name)}
        </div>
      )}

      {statusIndicator && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
      )}
    </div>
  );
}
