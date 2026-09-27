"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { FullPageStatus } from "@/components/full-page-status";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/lib/auth";
import { isMember } from "@/lib/roles";

// Client-side route guard for every non-public page. UX only: RLS returns
// nothing to a guest or anonymous caller regardless of what renders here.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, profile, loading } = useAuth();
  const allowed = Boolean(session && profile && isMember(profile.role, profile.is_active));

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/login");
    else if (!allowed) router.replace("/menunggu-akses");
  }, [loading, session, allowed, router]);

  if (loading || !allowed || !profile) return <FullPageStatus />;

  return <AppShell profile={profile}>{children}</AppShell>;
}
