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

const PROFILE_REQUEST_TIMEOUT_MS = 3500;
const normalizeGroup = (group: string | null | undefined): string | null =>
  typeof group === "string" ? group.trim().toLowerCase() : null;

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Track loading state
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null); // Track user profile data
  const [activeGroup, setActiveGroup] = useState<"ADMIN" | "USER" | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  // Query the session to check if the user is logged in and set the user state accordingly
  useEffect(() => {
    const clearLocalSession = async () => {
      await supabase.auth.signOut({ scope: "local" });
      setSession(null);
      setProfile(null);
      lastUserIdRef.current = null;
      setActiveGroup(null);
    };

    const fetchOrCreateProfile = async (session: Session) => {
      const withTimeout = async <T,>(promise: PromiseLike<T>, timeoutMs: number) => {
        return new Promise<T>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Profile request timed out"));
          }, timeoutMs);

          Promise.resolve(promise)
            .then((value) => {
              clearTimeout(timeout);
              resolve(value);
            })
            .catch((err) => {
              clearTimeout(timeout);
              reject(err);
            });
        });
      };

      const userId = session.user.id;
      const userEmail = session.user.email ?? null;
      const userMobile =
        typeof session.user.user_metadata?.mobile_number === "string"
          ? session.user.user_metadata.mobile_number
          : null;

      let data: Tables<"profiles"> | null = null;
      let error: Error | null = null;
      try {
        const response = await withTimeout(
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          PROFILE_REQUEST_TIMEOUT_MS
        );
        data = response.data;
        error = response.error;
      } catch {
        // Keep startup responsive when network is slow/unavailable.
        return null;
      }

      if (error) {
        console.log("Profile fetch error:", error.message);
        return null;
      }

      if (data) {
        return data;
      }

      let createdProfile: Tables<"profiles"> | null = null;
      let createError: Error | null = null;
      try {
        const response = await withTimeout(
          supabase
            .from("profiles")
            .insert({
              id: userId,
              email: userEmail,
              mobile_number: userMobile,
              group: "user",
            })
            .select("*")
            .single(),
          PROFILE_REQUEST_TIMEOUT_MS
        );
        createdProfile = response.data;
        createError = response.error;
      } catch {
        // Keep startup responsive when network is slow/unavailable.
        return null;
      }

      if (createError) {
        console.log("Profile create error:", createError.message);
        return null;
      }

      return createdProfile ?? null;
    };

    // UseEffect expects nothing or a cleanup function and can not be async, so we define an async function inside it and call it immediately.
    const fecthSession = async () => {
      let session: Session | null = null;
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          // Clear stale local credentials for any session bootstrap error.
          await clearLocalSession();
          setLoading(false);
          return;
        }

        session = currentSession;
      } catch {
        await clearLocalSession();
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

    const normalizedGroup = normalizeGroup(profile?.group);
    if (normalizedGroup && normalizedGroup !== "admin") {
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
        isAdmin: normalizeGroup(profile?.group) === "admin",
        activeGroup,
        setActiveGroup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

