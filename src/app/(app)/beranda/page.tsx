"use client";

import {
  ArrowRight,
  BarChart3,
  Clock,
  FileText,
  Gauge,
  Lightbulb,
  Search,
  Sparkles,
  Target,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { LogoStrip } from "@/components/brand/logos";
import { AskBox } from "@/components/home/ask-box";
import { Mascot } from "@/components/home/mascot";
import { useAuth } from "@/lib/auth";
import { askTania } from "@/lib/copilot-events";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const TEAM: UserRole[] = ["manager", "chapter_lead", "executive", "admin"];
const BUDGET: UserRole[] = ["pm", "manager", "chapter_lead", "executive", "admin"];

interface Access {
  href: string;
  title: string;
  text: string;
  icon: LucideIcon;
  tone: string;
  roles?: UserRole[];
}

const ACCESS: Access[] = [
  { href: "/talent/profil", title: "Profil Saya", text: "Capability, sertifikasi, gap, dan journey pengembangan", icon: UserRound, tone: "bg-violet-100 text-violet-700" },
  { href: "/timesheet", title: "Timesheet", text: "Isi jam mingguan, submit Jumat, persetujuan", icon: Clock, tone: "bg-sky-100 text-sky-700" },
  { href: "/workload", title: "Workload", text: "Alokasi, utilisasi, heatmap, dan alert", icon: BarChart3, tone: "bg-emerald-100 text-emerald-700" },
  { href: "/talent", title: "Talent", text: "Direktori kompetensi dan pencarian staffing", icon: Users, tone: "bg-amber-100 text-amber-700" },
  { href: "/feasibility", title: "Feasibility", text: "Pipeline case, scoring, dan keputusan", icon: Lightbulb, tone: "bg-orange-100 text-orange-700" },
  { href: "/budget", title: "Budget", text: "Plan vs komitmen vs realisasi", icon: Wallet, tone: "bg-rose-100 text-rose-700", roles: BUDGET },
  { href: "/dashboard", title: "Dashboard", text: "KPI sesuai peran dan briefing harian", icon: Gauge, tone: "bg-indigo-100 text-indigo-700" },
];

const VALUES = [
  { icon: Target, title: "Dari Insight ke Aksi" },
  { icon: Lightbulb, title: "Partner di Setiap Tantangan" },
  { icon: Users, title: "Talenta Kuat, Dampak Besar" },
];

function quickActions(role: UserRole) {
  const team = TEAM.includes(role);
  return [
    { label: "Analisis", icon: BarChart3, tone: "text-indigo-600", prompt: team ? "Analisis beban kerja tim bulan ini: siapa overload atau underload?" : "Bagaimana utilisasi saya bulan ini?" },
    { label: "Rangkum", icon: FileText, tone: "text-emerald-600", prompt: "Apa yang perlu saya perhatikan hari ini?" },
    { label: "Cari", icon: Search, tone: "text-sky-600", prompt: "Siapa yang tersedia dengan kompetensi Data Analytics bulan depan?" },
    { label: "Kembangkan", icon: Sparkles, tone: "text-orange-500", prompt: "Apa competency gap terbesar saya dan langkah pengembangannya?" },
  ];
}

export default function BerandaPage() {
  const { profile } = useAuth();
  if (!profile) return null;
  const firstName = (profile.full_name || profile.email || "").split(/\s+/)[0];
  const access = ACCESS.filter((a) => !a.roles || a.roles.includes(profile.role));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-[linear-gradient(120deg,#ffffff_0%,var(--tania-sky)_60%,#ffffff_100%)]">
        <div className="grid items-stretch md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:grid-cols-[minmax(0,4fr)_minmax(0,6fr)_minmax(0,2.4fr)]">
          <Mascot className="hidden h-full min-h-[420px] md:block" priority />

          <div className="flex flex-col justify-center gap-5 p-6 sm:p-8 lg:p-10">
            <div className="flex items-center gap-3 md:hidden">
              <Mascot className="size-16 shrink-0 rounded-full border" priority />
              <span className="text-xs font-semibold tracking-[0.2em] text-tania-navy/70 uppercase">AI Employee untuk DPS</span>
            </div>
            <p className="hidden text-xs font-semibold tracking-[0.2em] text-tania-navy/70 uppercase md:block">AI Employee untuk DPS</p>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-tania-navy sm:text-5xl">Hai {firstName},</h1>
              <p className="mt-1 text-2xl font-bold text-tania-navy sm:text-3xl">apa yang bisa saya bantu?</p>
            </div>
            <p className="max-w-xl text-base leading-relaxed text-tania-navy/75">
              Saya TANIA, asisten AI Chapter DPS. Saya membaca data talent, timesheet, workload, feasibility, dan budget —
              sesuai hak akses Anda — lalu mengubahnya menjadi insight dan langkah nyata.
            </p>
            <AskBox />
            <div className="flex flex-wrap gap-2">
              {quickActions(profile.role).map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => askTania(a.prompt)}
                  title={a.prompt}
                  className="inline-flex items-center gap-2 rounded-xl border bg-background px-4 py-2.5 text-sm font-medium text-tania-navy shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <a.icon className={cn("size-4", a.tone)} aria-hidden />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <aside className="hidden flex-col justify-center gap-3 border-l bg-white/50 p-5 backdrop-blur xl:flex" aria-label="Nilai TANIA">
            <p className="font-serif text-2xl leading-tight text-tania-navy italic">
              “Together We Scale
              <br />
              with <span className="text-telkom-red">AI</span>”
            </p>
            {VALUES.map((v) => (
              <div key={v.title} className="flex items-center gap-3 rounded-xl border bg-background px-3 py-3 text-sm font-medium text-tania-navy">
                <v.icon className="size-5 shrink-0 text-tania-navy/70" aria-hidden />
                {v.title}
              </div>
            ))}
          </aside>
        </div>
      </section>

      {/* Quick access */}
      <section aria-labelledby="akses-cepat" className="rounded-3xl border bg-background p-5 sm:p-6">
        <div className="mb-4">
          <h2 id="akses-cepat" className="text-sm font-bold tracking-[0.15em] text-tania-navy uppercase">
            Akses Cepat
          </h2>
          <p className="text-sm text-muted-foreground">Semua yang Anda butuhkan, di satu tempat.</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          {access.map((a) => (
            <li key={a.href}>
              <Link
                href={a.href}
                className="group flex h-full flex-col rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-tania-navy/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className={cn("grid size-10 place-items-center rounded-xl", a.tone)} aria-hidden>
                  <a.icon className="size-5" />
                </span>
                <span className="mt-3 font-semibold text-tania-navy">{a.title}</span>
                <span className="mt-1 flex-1 text-sm text-muted-foreground">{a.text}</span>
                <ArrowRight className="mt-3 ml-auto size-4 text-tania-navy/50 transition group-hover:translate-x-0.5 group-hover:text-telkom-red" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <LogoStrip className="py-4" />
    </div>
  );
}
