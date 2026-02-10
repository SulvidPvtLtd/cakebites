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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        const data = await fetchProfile(session.user.id);
        setProfile(data);
      } else {
        setProfile(null);
      }

      setLoading(false);
    };

    fecthSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);
      setSession(session);
      if (session) {
        const data = await fetchProfile(session.user.id);
        setProfile(data);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // The empty [] means: "Run this effect only once - on first render (mount), and never again."


  // console.log("AuthProvider session:", session); console.log(profile);
  console.log(profile);

  return (
    <AuthContext.Provider
      value={{ session, loading, profile, isAdmin: profile?.group === "ADMIN" }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
