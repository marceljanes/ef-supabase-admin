'use client';
import React from 'react';
import { LogOut, User, Shield, Crown } from 'lucide-react';
import { useAuth } from './AuthProvider';

export default function Header() {
  const { userProfile, signOut } = useAuth();

  if (!userProfile) return null;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Crown className="h-4 w-4 text-yellow-400" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-400" />;
      default:
        return <User className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-yellow-900/30 text-yellow-300 border-yellow-700';
      case 'admin':
        return 'bg-blue-900/30 text-blue-300 border-blue-700';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-600';
    }
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].split('.').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="bg-zinc-900 border-b border-zinc-700 px-6 py-4">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-medium text-white">
              {getInitials(userProfile.email)}
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-sm font-medium text-white">
                {userProfile.email.split('@')[0]}
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getRoleColor(userProfile.role)}`}>
                {getRoleIcon(userProfile.role)}
                {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
              </span>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={signOut}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
