"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { FullPageStatus } from "@/components/full-page-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { homeFor } from "@/lib/roles";
import { supabase } from "@/lib/supabase";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    // On success the AuthProvider picks up the session and the page redirects.
    if (error) {
      setError(friendlyError(error));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy ? "Memproses…" : "Masuk"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) return setError("Nama lengkap wajib diisi.");
    if (password.length < 8) return setError("Password minimal 8 karakter.");
    if (password !== confirm) return setError("Konfirmasi password tidak sama.");

    setBusy(true);
    // Only full_name goes into metadata; the database always assigns `guest`.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/login/`,
      },
    });
    setBusy(false);
    if (error) return setError(friendlyError(error));
    // With email confirmation on there is no session yet.
    if (!data.session) setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <div className="space-y-2 text-sm">
        <p className="font-medium">Pendaftaran berhasil.</p>
        <p className="text-muted-foreground">
          Kami mengirim tautan konfirmasi ke <strong>{sentTo}</strong>. Buka tautan tersebut, lalu
          masuk. Akun baru menunggu persetujuan Admin sebelum dapat mengakses data.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Nama lengkap</Label>
        <Input
          id="signup-name"
          autoComplete="name"
          required
          maxLength={200}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-confirm">Ulangi password</Label>
        <Input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy ? "Memproses…" : "Daftar"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Akun baru berstatus Guest dan menunggu persetujuan Admin.
      </p>
    </form>
  );
}

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, profile, loading } = useAuth();
  const initialTab = params.get("tab") === "daftar" ? "daftar" : "masuk";

  useEffect(() => {
    if (!loading && session) router.replace(homeFor(profile?.role, profile?.is_active));
  }, [loading, session, profile, router]);

  if (loading || session) return <FullPageStatus />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <Wordmark />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Selamat datang di TANIA</CardTitle>
          <CardDescription>Masuk atau daftar dengan email Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={initialTab}>
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="masuk">Masuk</TabsTrigger>
              <TabsTrigger value="daftar">Daftar</TabsTrigger>
            </TabsList>
            <TabsContent value="masuk">
              <SignInForm />
            </TabsContent>
            <TabsContent value="daftar">
              <SignUpForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<FullPageStatus />}>
      <LoginContent />
    </Suspense>
  );
}
