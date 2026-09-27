"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { CopilotBubble } from "@/components/copilot/copilot-bubble";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { NAV_ITEMS, ROLE_LABELS } from "@/lib/roles";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

function NavLinks({ profile, onNavigate }: { profile: Profile; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(profile.role));

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        if (!item.available) {
          return (
            <span
              key={item.href}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground/60"
              aria-disabled="true"
            >
              {item.label}
              <span className="text-[10px] tracking-wide uppercase">Segera</span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
              active && "bg-telkom-red/10 text-telkom-red",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  async function logout() {
    await signOut();
    router.replace("/");
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r bg-muted/30 p-4 md:block">
        <div className="mb-6 px-2">
          <Wordmark href="/dashboard" />
        </div>
        <NavLinks profile={profile} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex h-14 items-center justify-between gap-2 border-b px-3 sm:px-4">
          <div className="flex shrink-0 items-center gap-1 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label={open ? "Tutup menu" : "Buka menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X /> : <Menu />}
            </Button>
            <Wordmark href="/dashboard" compact />
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm leading-tight font-medium">{profile.full_name || profile.email}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
            <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
            <Button variant="outline" size="sm" onClick={logout}>
              Keluar
            </Button>
          </div>
        </header>

        {open && (
          <div className="border-b p-4 md:hidden">
            <NavLinks profile={profile} onNavigate={() => setOpen(false)} />
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
      {!pathname.startsWith("/dashboard") && <CopilotBubble />}
    </div>
  );
}
