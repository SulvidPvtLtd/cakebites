import { SUPABASE_AUTH_STORAGE_KEY, supabase } from "@/src/lib/supabase";
import type { Tables } from "@/src/database.types";
import { Session } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type AuthData = {
  session: Session | null;
  loading: boolean;
  profile: Tables<"profiles"> | null;
  isAdmin: boolean;
  activeGroup: "ADMIN" | "USER" | null;
  setActiveGroup: (group: "ADMIN" | "USER" | null) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthData>({
  session: null,
  loading: true,
  profile: null,
  isAdmin: false,
  activeGroup: null,
  setActiveGroup: () => {},
  signOut: async () => {},
});

const PROFILE_REQUEST_TIMEOUT_MS = 3500;
const AUTH_REQUEST_TIMEOUT_MS = 3500;
const REALTIME_AUTH_TIMEOUT_MS = 1500;
const normalizeGroup = (group: string | null | undefined): string | null =>
  typeof group === "string" ? group.trim().toLowerCase() : null;

const withTimeout = async <T,>(promise: PromiseLike<T>, timeoutMs: number) => {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Request timed out"));
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

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [activeGroup, setActiveGroup] = useState<"ADMIN" | "USER" | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  const setRealtimeAuth = async (token: string | null | undefined) => {
    try {
      await withTimeout(
        supabase.realtime.setAuth(token ?? ""),
        REALTIME_AUTH_TIMEOUT_MS
      );
    } catch {
      // Keep auth transitions responsive even if realtime is slow/offline.
    }
  };

  useEffect(() => {
    const clearLocalSession = async () => {
      await SecureStore.deleteItemAsync(SUPABASE_AUTH_STORAGE_KEY);
      await supabase.auth.signOut({ scope: "local" });
      setSession(null);
      setProfile(null);
      lastUserIdRef.current = null;
      setActiveGroup(null);
    };

    const fetchOrCreateProfile = async (session: Session) => {
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

    const fetchSession = async () => {
      let session: Session | null = null;
      try {
        const {
          data: { session: currentSession },
          error,
        } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_REQUEST_TIMEOUT_MS
        );

        if (error) {
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
      await setRealtimeAuth(session?.access_token);
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

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);
      try {
        setSession(session);
        await setRealtimeAuth(session?.access_token);

        if (!session) {
          lastUserIdRef.current = null;
          setActiveGroup(null);
          setProfile(null);
          return;
        }

        if (lastUserIdRef.current !== session.user.id) {
          lastUserIdRef.current = session.user.id;
          setActiveGroup(null);
        }

        const data = await fetchOrCreateProfile(session);
        setProfile(data);
      } catch (err) {
        console.log(
          "Auth state change handling failed:",
          err instanceof Error ? err.message : err
        );

        if (!session) {
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
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

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        profile,
        isAdmin: normalizeGroup(profile?.group) === "admin",
        activeGroup,
        setActiveGroup,
        signOut: async () => {
          const startedAt = Date.now();
          setSession(null);
          setProfile(null);
          setActiveGroup(null);
          lastUserIdRef.current = null;
          setRealtimeAuth(null);

          try {
            await supabase.auth.signOut({ scope: "local" });
            const elapsedMs = Date.now() - startedAt;
            if (elapsedMs > 1000) {
              console.log(`Sign out finished in ${elapsedMs}ms`);
            }
          } catch (err) {
            console.log(
              "Sign out failed:",
              err instanceof Error ? err.message : err
            );
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

