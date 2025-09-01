'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SimpleAuth() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.email);
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session);
      
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      }
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile error:', error);
        return;
      }

      console.log('Loaded profile:', data);
      setProfile(data);
    } catch (err) {
      console.error('Load profile error:', err);
    }
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log('Sign in successful:', data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="max-w-md w-full p-6">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">Sign In</h1>
          
          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded p-3 text-red-300 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={signIn} className="space-y-4">
            <div>
              <label className="block text-white mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                required
              />
            </div>
            <div>
              <label className="block text-white mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!profile || profile.status !== 'approved') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="max-w-md w-full p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Account Status</h1>
          <p className="text-zinc-400 mb-4">
            Hello {user.email}
          </p>
          <p className="text-amber-400 mb-6">
            Status: {profile?.status || 'No profile found'}
          </p>
          <div className="space-y-2">
            <button
              onClick={refreshProfile}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded mr-2"
            >
              Refresh Status
            </button>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400">{user.email}</span>
            <span className="px-2 py-1 bg-green-700 text-green-200 rounded text-xs">
              {profile.role}
            </span>
            <button
              onClick={signOut}
              className="px-3 py-1 bg-zinc-600 hover:bg-zinc-700 text-white rounded text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-700 rounded p-4">
          <h2 className="text-lg font-semibold text-white mb-3">Welcome!</h2>
          <p className="text-zinc-300 mb-4">You are successfully signed in and approved.</p>
          <div className="space-y-2 text-sm">
            <div className="text-zinc-400">Email: <span className="text-white">{user.email}</span></div>
            <div className="text-zinc-400">Role: <span className="text-white">{profile.role}</span></div>
            <div className="text-zinc-400">Status: <span className="text-green-400">{profile.status}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
