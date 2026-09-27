"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { supabase } from "./supabase";
import type { Profile } from "./types";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, squad, grade, location, manager_id, is_active, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("Gagal memuat profil", error);
    return null;
  }
  return data as Profile | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const apply = async (next: Session | null) => {
      const nextProfile = next ? await loadProfile(next.user.id) : null;
      if (!active) return;
      setSession(next);
      setProfile(nextProfile);
      setLoading(false);
    };

    supabase.auth.getSession().then(async ({ data }) => {
      // A stored session may have been revoked server-side (e.g. signed out
      // elsewhere). Validate it once; drop it locally if the server refuses.
      if (data.session) {
        const { error } = await supabase.auth.getUser();
        if (error && (error.status === 401 || error.status === 403)) {
          await supabase.auth.signOut({ scope: "local" });
          if (active) apply(null);
          return;
        }
      }
      apply(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      // Token refreshes do not change who the user is; skip the extra query.
      if (event === "TOKEN_REFRESHED") {
        setSession(next);
        return;
      }
      // Defer: calling Supabase inside this callback can deadlock the client.
      setTimeout(() => apply(next), 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) return null;
    const next = await loadProfile(session.user.id);
    setProfile(next);
    return next;
  }, [session]);

  const signOut = useCallback(async () => {
    // Only this browser: signing out here must not end sessions on other devices.
    await supabase.auth.signOut({ scope: "local" });
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ session, profile, loading, refreshProfile, signOut }),
    [session, profile, loading, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
