import { supabase } from "@/src/lib/supabase"; // supabase client
// project-defined profile type import (replaced by Supabase generated table type)
// import type { Profile } from "@/src/types";
import type { Tables } from "@/src/database.types";
import { Session } from "@supabase/supabase-js";
import {
    createContext,
    PropsWithChildren,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

// Declare type for the auth data
type AuthData = {
  session: Session | null;
  loading: boolean;
  profile: Tables<"profiles"> | null;
  isAdmin: boolean;
  activeGroup: "ADMIN" | "USER" | null;
  setActiveGroup: (group: "ADMIN" | "USER" | null) => void;
};

const AuthContext = createContext<AuthData>({
  session: null,
  loading: true,
  profile: null,
  isAdmin: false,
  activeGroup: null,
  setActiveGroup: () => {},
});

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Track loading state
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null); // Track user profile data
  const [activeGroup, setActiveGroup] = useState<"ADMIN" | "USER" | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  // Query the session to check if the user is logged in and set the user state accordingly
  useEffect(() => {
    const isInvalidRefreshTokenError = (message?: string) => {
      if (!message) return false;
      const normalized = message.toLowerCase();
      return (
        normalized.includes("invalid refresh token") ||
        normalized.includes("refresh token not found")
      );
    };

    const fetchOrCreateProfile = async (session: Session) => {
      const userId = session.user.id;
      const userEmail = session.user.email ?? null;
      const userMobile =
        typeof session.user.user_metadata?.mobile_number === "string"
          ? session.user.user_metadata.mobile_number
          : null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.log("Profile fetch error:", error.message);
        return null;
      }

      if (data) {
        return data;
      }

      const { data: createdProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email: userEmail,
          mobile_number: userMobile,
          group: "USER",
        })
        .select("*")
        .single();

      if (createError) {
        console.log("Profile create error:", createError.message);
        return null;
      }

      return createdProfile ?? null;
    };

    // UseEffect expects nothing or a cleanup function and can not be async, so we define an async function inside it and call it immediately.
    const fecthSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error && isInvalidRefreshTokenError(error.message)) {
        // Local-only sign out clears stale tokens that can trigger repeated refresh failures.
        await supabase.auth.signOut({ scope: "local" });
        setSession(null);
        setProfile(null);
        lastUserIdRef.current = null;
        setActiveGroup(null);
        setLoading(false);
        return;
      }

      setSession(session);
      if (!session) {
        lastUserIdRef.current = null;
        setActiveGroup(null);
      } else if (lastUserIdRef.current !== session.user.id) {
        lastUserIdRef.current = session.user.id;
        setActiveGroup(null);
      }

      if (session) {
        const data = await fetchOrCreateProfile(session);
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
      if (!session) {
        lastUserIdRef.current = null;
        setActiveGroup(null);
      } else if (lastUserIdRef.current !== session.user.id) {
        lastUserIdRef.current = session.user.id;
        setActiveGroup(null);
      }
      if (session) {
        const data = await fetchOrCreateProfile(session);
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

  useEffect(() => {
    if (!session) {
      if (activeGroup !== null) {
        setActiveGroup(null);
      }
      return;
    }

    if (profile?.group && profile.group !== "ADMIN") {
      if (activeGroup !== "USER") {
        setActiveGroup("USER");
      }
    }
  }, [session, profile?.group, activeGroup]);

  // console.log("AuthProvider session:", session); console.log(profile);
  // console.log(profile);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        profile,
        isAdmin: profile?.group === "ADMIN",
        activeGroup,
        setActiveGroup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
