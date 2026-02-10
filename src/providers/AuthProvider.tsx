import { supabase } from "@/src/lib/supabase"; // supabase client
import type { Profile } from "@/src/types";
import { Session } from "@supabase/supabase-js";
import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

// Declare type for the auth data
type AuthData = {
  session: Session | null;
  loading: boolean;
  loadingTimedOut: boolean;
  profile: Profile | null;
  isAdmin: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthData>({
  session: null,
  loading: true,
  loadingTimedOut: false,
  profile: null,
  isAdmin: false,
  refresh: async () => {},
});

const LOADING_TIMEOUT_MS = 6000;

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Track loading state
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null); // Track user profile data
  const mountedRef = useRef(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.log("Profile fetch error:", error.message);
      return null;
    }
    return data ?? null;
  }, []);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setLoadingTimedOut(false);
    try {
      const {
        data: { session },
      } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("getSession timeout")), 5000)
        ),
      ]);
      if (!mountedRef.current) return;
      setSession(session);

      if (session) {
        const data = await fetchProfile(session.user.id);
        if (!mountedRef.current) return;
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.log("Session fetch error:", (error as Error).message);
      if (mountedRef.current) {
        setSession(null);
        setProfile(null);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchProfile]);

  // Query the session to check if the user is logged in and set the user state accordingly
  useEffect(() => {
    mountedRef.current = true;
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mountedRef.current) return;
      setLoading(true);
      setLoadingTimedOut(false);
      setSession(session);
      if (session) {
        const data = await fetchProfile(session.user.id);
        if (!mountedRef.current) return;
        setProfile(data);
      } else {
        setProfile(null);
      }
      if (mountedRef.current) setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, loadSession]);

  useEffect(() => {
    if (!loading) {
      setLoadingTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      if (mountedRef.current) setLoadingTimedOut(true);
    }, LOADING_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [loading]);

  const refresh = useCallback(async () => {
    await loadSession();
  }, [loadSession]);


  // console.log("AuthProvider session:", session); console.log(profile);
  // console.log(profile);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        loadingTimedOut,
        profile,
        isAdmin: profile?.group === "ADMIN",
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
