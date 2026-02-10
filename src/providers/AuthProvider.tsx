import { supabase } from "@/src/lib/supabase"; // supabase client
import type { Profile } from "@/src/types";
import { Session } from "@supabase/supabase-js";
import {
    createContext,
    PropsWithChildren,
    useContext,
    useEffect,
    useState,
} from "react";

// Declare type for the auth data
type AuthData = {
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthData>({
  session: null,
  loading: true,
  profile: null,
  isAdmin: false,
});

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Track loading state
  const [profile, setProfile] = useState<Profile | null>(null); // Track user profile data

  // Query the session to check if the user is logged in and set the user state accordingly
  useEffect(() => {
    let isActive = true;
    const fetchProfile = async (userId: string) => {
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
    };

    // UseEffect expects nothing or a cleanup function and can not be async, so we define an async function inside it and call it immediately.
    const fecthSession = async () => {
      try {
        const {
          data: { session },
        } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("getSession timeout")), 5000)
          ),
        ]);
        if (!isActive) return;
        setSession(session);

        if (session) {
          const data = await fetchProfile(session.user.id);
          if (!isActive) return;
          setProfile(data);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.log("Session fetch error:", (error as Error).message);
        if (isActive) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fecthSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isActive) return;
      setLoading(true);
      setSession(session);
      if (session) {
        const data = await fetchProfile(session.user.id);
        if (!isActive) return;
        setProfile(data);
      } else {
        setProfile(null);
      }
      if (isActive) setLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []); // The empty [] means: "Run this effect only once - on first render (mount), and never again."


  // console.log("AuthProvider session:", session); console.log(profile);
  // console.log(profile);

  return (
    <AuthContext.Provider
      value={{ session, loading, profile, isAdmin: profile?.group === "ADMIN" }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
