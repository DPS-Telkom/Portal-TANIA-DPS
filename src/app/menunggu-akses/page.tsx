"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { FullPageStatus } from "@/components/full-page-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { isMember } from "@/lib/roles";

export default function WaitingForAccessPage() {
  const router = useRouter();
  const { session, profile, loading, refreshProfile, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [stillWaiting, setStillWaiting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/login");
    else if (isMember(profile?.role, profile?.is_active)) router.replace("/beranda");
  }, [loading, session, profile, router]);

  if (loading || !session || isMember(profile?.role, profile?.is_active)) {
    return <FullPageStatus />;
  }

  const deactivated = profile && profile.role !== "guest" && !profile.is_active;

  async function checkAgain() {
    setChecking(true);
    const next = await refreshProfile();
    setChecking(false);
    setStillWaiting(!isMember(next?.role, next?.is_active));
  }

  async function logout() {
    await signOut();
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <Wordmark />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {deactivated ? "Akun Anda dinonaktifkan" : "Akun Anda menunggu persetujuan Admin"}
          </CardTitle>
          <CardDescription>
            {deactivated
              ? "Hubungi Admin TANIA bila menurut Anda ini keliru."
              : "Pendaftaran berhasil. Admin akan menetapkan peran Anda; setelah itu Anda dapat mengakses TANIA."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Nama</dt>
            <dd>{profile?.full_name || "—"}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{profile?.email ?? session.user.email}</dd>
          </dl>
          {stillWaiting && (
            <p className="text-sm text-muted-foreground" role="status">
              Belum ada perubahan. Silakan cek lagi nanti.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {!deactivated && (
              <Button onClick={checkAgain} disabled={checking}>
                {checking ? "Memeriksa…" : "Periksa lagi"}
              </Button>
            )}
            <Button variant="outline" onClick={logout}>
              Keluar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
