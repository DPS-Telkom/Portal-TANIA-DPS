"use client";

import {
  BarChart3,
  Clock,
  Gauge,
  Home,
  Lightbulb,
  Menu,
  Search,
  Settings,
  UserRound,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/brand/logos";
import { Wordmark } from "@/components/brand/wordmark";
import { CopilotBubble } from "@/components/copilot/copilot-bubble";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { askTania } from "@/lib/copilot-events";
import { NAV_ITEMS, ROLE_LABELS } from "@/lib/roles";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "/beranda": Home,
  "/dashboard": Gauge,
  "/talent/profil": UserRound,
  "/talent": Users,
  "/timesheet": Clock,
  "/workload": BarChart3,
  "/feasibility": Lightbulb,
  "/budget": Wallet,
  "/admin": Settings,
};

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

function NavLinks({ profile, onNavigate }: { profile: Profile; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(profile.role));
  // The most specific matching href wins (e.g. /talent/profil over /talent).
  const activeHref = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="flex flex-col gap-1" aria-label="Menu utama">
      {items.map((item) => {
        const Icon = ICONS[item.href] ?? Home;
        const active = item.href === activeHref;
        if (!item.available) {
          return (
            <span
              key={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground/60"
              aria-disabled="true"
            >
              <Icon className="size-4.5" aria-hidden />
              {item.label}
              <span className="ml-auto text-[10px] tracking-wide uppercase">Segera</span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-tania-navy/80 transition-colors hover:bg-tania-sky hover:text-tania-navy",
              active && "bg-tania-sky text-tania-navy shadow-[inset_3px_0_0_var(--telkom-red)]",
            )}
          >
            <Icon className={cn("size-4.5", active ? "text-telkom-red" : "text-tania-navy/60")} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function HeaderSearch() {
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className="relative hidden w-full max-w-md md:block"
      onSubmit={(e) => {
        e.preventDefault();
        askTania(q);
        setQ("");
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        maxLength={2000}
        placeholder="Cari data atau tanya TANIA…"
        aria-label="Tanya TANIA"
        className="h-10 w-full rounded-full border border-input bg-background pr-4 pl-10 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </form>
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
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--tania-sky),#ffffff_320px)] md:grid md:grid-cols-[248px_1fr]">
      <aside className="hidden flex-col border-r bg-background/80 px-4 py-5 backdrop-blur md:flex">
        <div className="mb-6 space-y-4 px-2">
          <Logo name="telkom" className="h-11" />
          <Wordmark href="/beranda" tagline />
        </div>
        <NavLinks profile={profile} />
        <div className="mt-auto space-y-3 px-2 pt-8">
          <p className="text-sm leading-snug font-semibold text-tania-navy/70 italic">
            Stronger People,
            <br />
            Smarter Ways,
            <br />
            <span className="text-telkom-red">Bigger Impact</span>
          </p>
          <Logo name="scale" className="h-9" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-3 backdrop-blur sm:px-6">
          <div className="flex shrink-0 items-center gap-1 md:hidden">
            <Button variant="ghost" size="icon" aria-label={open ? "Tutup menu" : "Buka menu"} onClick={() => setOpen((v) => !v)}>
              {open ? <X /> : <Menu />}
            </Button>
            <Wordmark href="/beranda" compact />
          </div>
          <HeaderSearch />
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-tania-navy text-xs font-semibold text-white" aria-hidden>
              {initials(profile.full_name || profile.email || "?")}
            </div>
            <div className="hidden min-w-0 text-left sm:block">
              <p className="truncate text-sm leading-tight font-semibold text-tania-navy">{profile.full_name || profile.email}</p>
              <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              Keluar
            </Button>
          </div>
        </header>

        {open && (
          <div className="border-b bg-background p-4 md:hidden">
            <NavLinks profile={profile} onNavigate={() => setOpen(false)} />
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
      {!pathname.startsWith("/dashboard") && <CopilotBubble />}
    </div>
  );
}
