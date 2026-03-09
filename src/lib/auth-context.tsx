"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type UserRole = "seeker" | "admin";

export interface Profile {
  id: string;
  fullName: string | null;
  phone: string | null;
  role: UserRole;
  kycStatus: "unverified" | "pending" | "verified";
  agentModeEnabled: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string, userMeta?: Record<string, string>) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile({
        id: data.id,
        fullName: data.full_name,
        phone: data.phone,
        role: data.role as UserRole,
        kycStatus: data.kyc_status,
        agentModeEnabled: data.agent_mode_enabled,
      });
    } else if (userMeta) {
      // Relying on Postgres trigger `on_auth_user_created` to create the profile row on the backend.
      // Setting local state here just in case of any slight network delay fetching the new row.
      setProfile({
        id: userId,
        fullName: userMeta.full_name ?? null,
        phone: null,
        role: (userMeta.role as UserRole) ?? "seeker",
        kycStatus: "unverified",
        agentModeEnabled: false,
      });
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await fetchProfile(session.user.id, session.user.user_metadata as Record<string, string>);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.user_metadata as Record<string, string>);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
