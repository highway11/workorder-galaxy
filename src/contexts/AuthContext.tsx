
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

    const checkSession = async () => {
        console.log("AuthContext: Checking session...");
        try {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                // Log the specific error from Supabase
                console.error("AuthContext: Error getting session:", error.message);
            }

            if (isMounted) {
                setSession(session);
                setUser(session?.user ?? null);
                
                if (session?.user) {
                    console.log("AuthContext: User authenticated, fetching profile...");
                    await fetchUserProfile(session.user.id);
                }
                console.log("AuthContext: Session check complete. User:", session?.user ?? null);
            }
        } catch (catchError) {
            // Catch any unexpected errors during the async operation
            console.error("AuthContext: Unexpected error during getSession:", catchError);
        } finally {
            // *** Ensure loading is set to false even if there's an error ***
            if (isMounted) {
                setIsLoading(false);
                console.log("AuthContext: Loading set to false.");
            }
        }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
            console.log("AuthContext: Auth state changed. Event:", _event, "Session:", session);
            if (isMounted) {
                setSession(session);
                setUser(session?.user ?? null);
                
                // If user is logged in, fetch their profile
                if (session?.user && _event === 'SIGNED_IN') {
                    console.log("AuthContext: User signed in, fetching profile...");
                    setTimeout(() => {
                        fetchUserProfile(session.user.id);
                    }, 0);
                }
            }
        }
    );

    // Cleanup function
    return () => {
        isMounted = false;
        if (subscription) {
            subscription.unsubscribe();
            console.log("AuthContext: Unsubscribed from auth state changes.");
        }
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
