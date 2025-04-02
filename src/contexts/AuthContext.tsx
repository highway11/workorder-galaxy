
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("AuthContext: Auth state changed. Event:", event, "Session:", session ? "exists" : "null");
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          // If user is logged in, fetch their profile with setTimeout to prevent deadlocks
          if (session?.user) {
            setTimeout(() => {
              if (isMounted) fetchUserProfile(session.user.id);
            }, 0);
          }
        }
      }
    );

    // THEN check for existing session
    const checkSession = async () => {
      console.log("AuthContext: Checking session...");
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("AuthContext: Error getting session:", error.message);
        }

        if (isMounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          
          if (data.session?.user) {
            console.log("AuthContext: User authenticated, fetching profile...");
            setTimeout(() => {
              if (isMounted) fetchUserProfile(data.session.user.id);
            }, 0);
          }
          setIsLoading(false);
          console.log("AuthContext: Session check complete. User:", data.session?.user ? "exists" : "null");
        }
      } catch (catchError) {
        console.error("AuthContext: Unexpected error during getSession:", catchError);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    // Cleanup function
    return () => {
      isMounted = false;
      subscription.unsubscribe();
      console.log("AuthContext: Unsubscribed from auth state changes.");
    };
  }, []); // Empty dependency array ensures this runs only once 

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("AuthContext: Fetching profile for user ID:", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }
      
      console.log("AuthContext: Profile fetched successfully:", data);
      setProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };
  
  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "There was an error signing out",
        variant: "destructive",
      });
      console.error('Error signing out:', error);
    }
  };

  const value = {
    session,
    user,
    profile,
    isLoading,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
