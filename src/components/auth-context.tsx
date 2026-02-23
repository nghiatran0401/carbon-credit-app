'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsAuthenticated(true);
        // Fetch user from database using supabaseUserId for better linking
        fetchUserFromDb(session.user.email!, session.user.id);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        // Fetch user from database using supabaseUserId for better linking
        fetchUserFromDb(session.user.email!, session.user.id);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
    // supabase is from a ref and is stable; adding it would not change behavior
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserFromDb = async (email: string, supabaseUserId?: string): Promise<boolean> => {
    try {
      // Try to fetch by supabaseUserId first (more reliable), then fallback to email
      const queryParam = supabaseUserId
        ? `supabaseUserId=${encodeURIComponent(supabaseUserId)}`
        : `email=${encodeURIComponent(email)}`;

      const res = await fetch(`/api/users?${queryParam}`);
      if (res.ok) {
        const userData = await res.json();
        if (userData) {
          setUser(userData);
          return true; // User found
        }
      }
      return false; // User not found
    } catch (error) {
      console.error('Error fetching user:', error);
      return false; // Error occurred
    }
  };

  const login = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setIsAuthenticated(true);
        await fetchUserFromDb(data.user.email!, data.user.id);
      }
    },
    [supabase],
  );

  const signup = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      company?: string,
    ) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName,
            lastName,
            company,
          },
        },
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Failed to create account');
      }

      setIsAuthenticated(true);

      let retries = 0;
      const maxRetries = 5;
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      let userFound = false;

      while (retries < maxRetries && !userFound) {
        await delay(retries * 200);
        userFound = await fetchUserFromDb(data.user.email!, data.user.id);
        retries++;
      }

      if (!userFound) {
        console.warn(
          'User record not found immediately after signup. It may be created by trigger shortly.',
        );
      }
    },
    [supabase],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUser(null);
  }, [supabase]);

  const contextValue = useMemo(
    () => ({ isAuthenticated, user, login, logout, signup, loading }),
    [isAuthenticated, user, login, logout, signup, loading],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
