import { BarChart3, Bot, Clock, Lightbulb, ShieldCheck, Target, Users, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Logo, LogoStrip } from "@/components/brand/logos";
import { Wordmark } from "@/components/brand/wordmark";
import { Mascot } from "@/components/home/mascot";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Public HOME (XM-06): reachable without a session and reads nothing from
// the database. Content from PRD §1.
const MODULES: { code: string; name: string; question: string; text: string; icon: LucideIcon; tone: string }[] = [
  { code: "TM", name: "Talent Management", question: "Who do we have?", text: "Profil talent 360°, kompetensi, sertifikasi, dan riwayat penugasan.", icon: Users, tone: "bg-amber-100 text-amber-700" },
  { code: "WA", name: "Workload Analysis", question: "Who is available / overloaded?", text: "Alokasi vs realisasi, utilisasi per orang dan squad, heatmap, alert.", icon: BarChart3, tone: "bg-emerald-100 text-emerald-700" },
  { code: "TS", name: "Project Timesheet", question: "Where is our effort going?", text: "Entry jam mingguan, approval manager, dan kepatuhan submit.", icon: Clock, tone: "bg-sky-100 text-sky-700" },
  { code: "PF", name: "Project Feasibility", question: "Which project should we pursue?", text: "Scoring 5 dimensi, resource check, dan keputusan beraudit.", icon: Lightbulb, tone: "bg-orange-100 text-orange-700" },
  { code: "BC", name: "Budget Control", question: "Are we on budget?", text: "Plan vs komitmen vs realisasi dengan alert threshold.", icon: Wallet, tone: "bg-rose-100 text-rose-700" },
  { code: "AV", name: "TANIA Copilot", question: "What should I look at today?", text: "Briefing harian dan tanya-jawab dari data live, sesuai hak akses.", icon: Bot, tone: "bg-violet-100 text-violet-700" },
];

const VALUES = [
  { icon: Target, title: "Dari Insight ke Aksi", text: "Keputusan memakai data approved dengan periode yang jelas." },
  { icon: ShieldCheck, title: "Aman sejak database", text: "Row Level Security: Anda hanya melihat data sesuai peran." },
  { icon: Users, title: "Talenta Kuat, Dampak Besar", text: "Setiap approval dan keputusan tercatat: siapa, kapan, mengapa." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--tania-sky),#ffffff_420px)]">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo name="telkom" className="h-10 max-sm:hidden" />
            <span className="h-8 w-px bg-border max-sm:hidden" aria-hidden />
            <Wordmark tagline />
          </div>
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-6 font-semibold")}>
            LOGIN
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <section className="relative overflow-hidden rounded-3xl border bg-[linear-gradient(120deg,#ffffff_0%,var(--tania-sky)_60%,#ffffff_100%)]">
          <div className="grid items-stretch md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <Mascot className="hidden h-full min-h-[440px] md:block" priority />
            <div className="flex flex-col justify-center gap-5 p-6 sm:p-10">
              <div className="flex items-center gap-3 md:hidden">
                <Mascot className="size-16 shrink-0 rounded-full border" priority />
                <span className="text-xs font-semibold tracking-[0.2em] text-tania-navy/70 uppercase">Chapter DPS · Telkom Indonesia</span>
              </div>
              <p className="hidden text-xs font-semibold tracking-[0.2em] text-tania-navy/70 uppercase md:block">
                Chapter Product &amp; Solution · Telkom Indonesia
              </p>
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-tania-navy sm:text-6xl">Hai, saya TANIA.</h1>
                <p className="mt-2 text-xl font-semibold text-tania-navy/80 sm:text-2xl">Talent · Analytics · Insight · Action</p>
              </div>
              <p className="max-w-2xl text-base leading-relaxed text-tania-navy/75 sm:text-lg">
                Management cockpit Chapter DPS: satu platform, satu data model, satu alur keputusan untuk talent, workload,
                effort, project pipeline, dan budget — dengan asisten AI yang menjawab pertanyaan manajemen dalam hitungan
                detik, bukan hari.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-7 font-semibold")}>
                  LOGIN
                </Link>
                <Link href="/login?tab=daftar" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-full bg-background px-7")}>
                  Daftar akun baru
                </Link>
              </div>
              <p className="font-serif text-lg text-tania-navy/80 italic">
                “Together We Scale with <span className="text-telkom-red">AI</span>”
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="flex gap-3 rounded-2xl border bg-background p-4">
              <v.icon className="mt-0.5 size-5 shrink-0 text-telkom-red" aria-hidden />
              <div>
                <h3 className="font-semibold text-tania-navy">{v.title}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{v.text}</p>
              </div>
            </div>
          ))}
        </section>

        <section aria-labelledby="modul" className="rounded-3xl border bg-background p-5 sm:p-6">
          <h2 id="modul" className="text-sm font-bold tracking-[0.15em] text-tania-navy uppercase">
            Enam modul, satu alur keputusan
          </h2>
          <p className="text-sm text-muted-foreground">Timesheet → workload → resource check → budget commitment → keputusan manajemen.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <li key={m.code} className="flex h-full flex-col rounded-2xl border p-4">
                <div className="flex items-center gap-3">
                  <span className={cn("grid size-10 place-items-center rounded-xl", m.tone)} aria-hidden>
                    <m.icon className="size-5" />
                  </span>
                  <div>
                    <div className="text-[11px] font-bold tracking-widest text-telkom-red">{m.code}</div>
                    <div className="font-semibold text-tania-navy">{m.name}</div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground italic">{m.question}</p>
                <p className="mt-1 text-sm">{m.text}</p>
              </li>
            ))}
          </ul>
        </section>
        <LogoStrip className="rounded-3xl border bg-background px-4 py-6" />
      </main>

      <footer className="border-t bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <span>Internal PT Telkom Indonesia (Persero) Tbk — Digital Product, Chapter Product &amp; Solution.</span>
          <span>Stronger People · Smarter Ways · Bigger Impact</span>
        </div>
      </footer>
    </div>
  );
}
