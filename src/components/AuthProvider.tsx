'use client';
import React, { useState, useEffect, createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '@/types/database';
import { dbService, supabase } from '@/lib/supabase';
import AuthForm from './AuthForm';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Fix hydration issues by waiting for client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const checkAuth = async (retryCount = 0, maxRetries = 5, isHeartbeat = false) => {
    if (!mounted) return;
    
    try {
      // More aggressive timeout strategy - shorter for initial checks, longer for heartbeat
      const timeoutDuration = isHeartbeat ? 30000 : (15000 + (retryCount * 5000));
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timeout')), timeoutDuration)
      );
      
      const authPromise = (async () => {
        // Try to get session from local storage first for speed
        let authUser;
        let fromCache = false;
        
        if (typeof window !== 'undefined' && retryCount === 0) {
          const cachedSession = localStorage.getItem('ef-auth-cache');
          const lastSuccess = localStorage.getItem('ef-auth-last-success');
          
          if (cachedSession && lastSuccess) {
            const timeSinceSuccess = Date.now() - parseInt(lastSuccess);
            // Use cached session if less than 2 minutes old
            if (timeSinceSuccess < 2 * 60 * 1000) {
              try {
                const parsed = JSON.parse(cachedSession);
                if (parsed.user && parsed.profile) {
                  console.log('Using cached auth session');
                  setUser(parsed.user);
                  setUserProfile(parsed.profile);
                  fromCache = true;
                  return;
                }
              } catch (e) {
                console.warn('Failed to parse cached session');
              }
            }
          }
        }
        
        if (!fromCache) {
          authUser = await dbService.getCurrentUser();
          
          if (authUser) {
            const profile = await dbService.getCurrentUserProfile();
            setUser(authUser);
            setUserProfile(profile);
            
            // Cache successful auth
            if (typeof window !== 'undefined') {
              localStorage.setItem('ef-auth-last-success', Date.now().toString());
              localStorage.setItem('ef-auth-cache', JSON.stringify({ 
                user: authUser, 
                profile: profile,
                timestamp: Date.now() 
              }));
              sessionStorage.setItem('ef-auth-backup', JSON.stringify({ 
                userId: authUser.id, 
                email: authUser.email,
                timestamp: Date.now() 
              }));
            }
          } else {
            setUser(null);
            setUserProfile(null);
            // Clear cache on logout
            if (typeof window !== 'undefined') {
              localStorage.removeItem('ef-auth-cache');
            }
          }
        }
      })();
      
      await Promise.race([authPromise, timeoutPromise]);
      
    } catch (error) {
      console.error(`Auth check failed (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Enhanced retry logic with exponential backoff
      if ((errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) && retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s
        console.warn(`Retrying auth check in ${delay / 1000} seconds... (${retryCount + 1}/${maxRetries})`);
        
        setTimeout(() => {
          checkAuth(retryCount + 1, maxRetries, isHeartbeat);
        }, delay);
        return;
      }
      
      // Enhanced fallback mechanisms
      if (typeof window !== 'undefined') {
        const lastSuccess = localStorage.getItem('ef-auth-last-success');
        const cachedSession = localStorage.getItem('ef-auth-cache');
        const backupSession = sessionStorage.getItem('ef-auth-backup');
        
        if (lastSuccess && (cachedSession || backupSession)) {
          const timeSinceSuccess = Date.now() - parseInt(lastSuccess);
          // Extended session preservation for network issues - 15 minutes
          if (timeSinceSuccess < 15 * 60 * 1000) {
            console.warn('Auth check failed but preserving session based on recent success');
            
            // Try to restore from cache
            if (cachedSession) {
              try {
                const parsed = JSON.parse(cachedSession);
                if (parsed.user && parsed.profile) {
                  console.log('Restoring from cached session during network issues');
                  setUser(parsed.user);
                  setUserProfile(parsed.profile);
                  return;
                }
              } catch (e) {
                console.warn('Failed to restore cached session');
              }
            }
            
            return; // Keep current session without logout
          }
        }
      }
      
      // Only logout if we're sure the session is invalid (not network issues)
      if (!errorMessage.includes('timeout') && !errorMessage.includes('network') && !errorMessage.includes('fetch')) {
        console.log('Logging out due to invalid session');
        setUser(null);
        setUserProfile(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ef-auth-cache');
          localStorage.removeItem('ef-auth-last-success');
        }
      } else {
        console.warn('Network error detected, preserving current session');
      }
    } finally {
      if (retryCount === 0) { // Only set loading false on initial attempt
        setLoading(false);
      }
    }
  };

  const refreshAuth = async () => {
    await checkAuth();
  };

  const signOut = async () => {
    try {
      await dbService.signOut();
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    if (!mounted) return;

    let isInitialized = false;

    // Force loading to false after 15 seconds max
    const maxLoadingTimeout = setTimeout(() => {
      console.log('Force setting loading to false after timeout');
      setLoading(false);
    }, 15000);

    // Initial auth check
    const initializeAuth = async () => {
      if (isInitialized) return;
      isInitialized = true;
      
      try {
        await checkAuth();
      } finally {
        clearTimeout(maxLoadingTimeout);
      }
    };

    initializeAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        try {
          console.log('Auth state change:', event, session?.user?.email);
          
          if (event === 'SIGNED_IN' && session?.user) {
            const profile = await dbService.getCurrentUserProfile();
            setUser(session.user);
            setUserProfile(profile);
            
            // Update success timestamp
            if (typeof window !== 'undefined') {
              localStorage.setItem('ef-auth-last-success', Date.now().toString());
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setUserProfile(null);
            
            // Clear stored timestamps
            if (typeof window !== 'undefined') {
              localStorage.removeItem('ef-auth-last-success');
              sessionStorage.removeItem('ef-auth-backup');
              localStorage.removeItem('ef-auth-cache');
            }
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            console.log('Token refreshed successfully');
            if (typeof window !== 'undefined') {
              localStorage.setItem('ef-auth-last-success', Date.now().toString());
            }
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
        }
        
        // Only set loading false if we're still in loading state
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(maxLoadingTimeout);
      isInitialized = true; // Prevent any further initialization
    };
  }, [mounted]); // Removed 'user' from dependencies to prevent infinite loop

  // Separate useEffect for heartbeat that doesn't cause re-renders
  useEffect(() => {
    if (!mounted || !user) return;
    
    // Session heartbeat - check auth every 5 minutes to keep session alive
    const heartbeatInterval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const lastSuccess = localStorage.getItem('ef-auth-last-success');
        if (lastSuccess) {
          const timeSinceSuccess = Date.now() - parseInt(lastSuccess);
          // Only do heartbeat check if it's been more than 3 minutes since last success
          if (timeSinceSuccess > 3 * 60 * 1000) {
            console.log('Performing session heartbeat...');
            checkAuth(0, 2, true); // Heartbeat with 2 retries
          }
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Listen for network status changes
    const handleOnline = () => {
      console.log('Network online - checking auth status');
      checkAuth(0, 1); // Quick auth check when coming back online
    };
    
    const handleOffline = () => {
      console.log('Network offline - preserving current auth state');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      clearInterval(heartbeatInterval);
      
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [mounted, user?.id]); // Use user.id instead of user object to prevent unnecessary re-renders

  const value = {
    user,
    userProfile,
    loading,
    signOut,
    refreshAuth
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  // Show loading spinner for maximum 2 seconds
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
          <p className="text-sm text-gray-500 mt-2">This should only take a moment</p>
        </div>
      </div>
    );
  }

  // Show auth form if no user
  if (!user) {
    return (
      <AuthContext.Provider value={value}>
        <AuthForm />
      </AuthContext.Provider>
    );
  }

  // Show pending approval message
  if (userProfile && userProfile.status === 'pending') {
    return (
      <AuthContext.Provider value={value}>
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="max-w-md mx-auto text-center p-8 bg-gray-800 rounded-lg shadow-lg">
            <div className="mb-4">
              <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Approval Pending</h2>
              <p className="text-gray-300 mb-4">
                Your account is pending approval. Please wait for an administrator to approve your access.
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Email: {user.email}
              </p>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  // Show access denied for non-approved users
  if (!userProfile || userProfile.status !== 'approved') {
    return (
      <AuthContext.Provider value={value}>
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="max-w-md mx-auto text-center p-8 bg-gray-800 rounded-lg shadow-lg">
            <div className="mb-4">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
              <p className="text-gray-300 mb-4">
                Your account access has been denied or is not properly configured.
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Email: {user.email}
              </p>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  // User is approved, show the app
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
