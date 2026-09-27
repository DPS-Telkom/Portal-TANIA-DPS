# TANIA — Portal Digital Product & Solution

**T**alent · **A**nalytics · **I**nsight · **A**ction

Portal internal Chapter Product & Solution (DPS), Digital Product, PT Telkom Indonesia (Persero) Tbk — satu platform pendukung keputusan manajemen untuk talent, workload, timesheet, kelayakan proyek, dan anggaran chapter.

## Modul

| Modul | Kode | Fungsi utama |
|---|---|---|
| Talent Management | TM | Profil talent, competency matrix, riwayat penugasan, pencarian staffing |
| Workload Analysis | WA | Alokasi vs realisasi, utilisasi per orang/squad, heatmap & alert overload |
| Project Timesheet | TS | Entry jam mingguan per project/aktivitas, workflow approval manager, compliance |
| Project Feasibility | PF | Intake kandidat proyek, scoring berbobot 5 dimensi, keputusan go/no-go/hold beraudit |
| Budget Control | BC | Plan vs commitment vs realisasi per program/kategori, alert threshold |
| Avatar / Copilot AI | AV | Asisten AI: briefing proaktif harian di dashboard + tanya-jawab berbasis data live (read-only, hak akses identik user) |

Referensi lengkap: **`docs/PRD.md` — PRD v3.0 Development Ready** (menggantikan Requirement Document v1.0 & PRD v2.0).

## Arsitektur

```
Browser ──► Vercel (Hobby, free) ──► Next.js static export (SPA, tanpa server)
   │
   ├──────► Supabase (Free) ──► PostgreSQL + RLS · Auth · Storage
   └──────► Edge Function tania-assistant ──► Claude API (copilot, pay-per-use)
```

- **Tanpa API server sendiri** — frontend berbicara langsung ke Supabase via `supabase-js`.
- **Keamanan sepenuhnya di Row Level Security (RLS)** PostgreSQL, per role: `executive`, `chapter_lead`, `manager`, `pm`, `talent`, `admin`.
- **Biaya infrastruktur MVP: Rp 0** (free tier Supabase + Vercel Hobby; catatan: syarat Hobby non-commercial — rencanakan Vercel Pro saat menjadi sistem resmi).
- **Registrasi terbuka dengan pola Guest**: pendaftar baru otomatis role `guest` tanpa akses data, menunggu persetujuan Admin di halaman `/admin`.

## Menjalankan Secara Lokal

Prasyarat: Node.js 20+, npm, [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
git clone <url-repo> tania-portal
cd tania-portal
npm install

# Konfigurasi environment
cp .env.example .env.local
# Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY
# dari Supabase Dashboard → Settings → API

npm run dev            # http://localhost:3000
```

`.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

> ⚠️ Jangan pernah memakai atau meng-commit `service_role` key.

## Database

Semua perubahan skema lewat file migrasi di `supabase/migrations/` — tidak pernah lewat dashboard.

```bash
supabase link --project-ref <project-ref>   # sekali saja
supabase db push                            # apply migrasi
supabase gen types typescript --linked > src/lib/database.types.ts
```

Setup awal setelah migrasi pertama (lihat detail di `docs/README_MIGRASI.md`):
1. Buat user pertama di Dashboard → Authentication (profil dibuat otomatis).
2. `update public.profiles set role = 'admin' where email = '...';`
3. Biarkan self-signup menyala — pendaftar baru otomatis role `guest` (tanpa akses) sampai Admin memberi role di `/admin`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Static export ke `out/` — wajib lolos sebelum commit |
| `npm run lint` | Linting |
| `supabase db push` | Apply migrasi baru |

## Deploy (Vercel Hobby)

Vercel tersambung ke GitHub: **setiap push ke `main` otomatis ter-deploy** — tanpa jatah/kredit deploy.

1. vercel.com → Add New → Project → import repo `tania-portal` (Next.js terdeteksi otomatis).
2. Set Environment Variables di project Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Kerja harian di branch `dev`; merge ke `main` saat fitur selesai. Preview deployment untuk PR boleh dipakai.
4. Setelah domain production fix, kencangkan CORS Edge Function `tania-assistant` ke domain Vercel tersebut.

> TANIA tetap static export di Vercel — jangan aktifkan fitur server Vercel (SSR/functions); satu-satunya server-side adalah Edge Function di Supabase.

Otomasi pendukung (GitHub Actions, gratis):
- **Keep-alive** ping Supabase tiap 3 hari — mencegah auto-pause free tier setelah 7 hari sepi.
- **Backup mingguan** `supabase db dump` — pengganti backup otomatis yang tidak tersedia di free tier.

## Struktur Repo

```
src/app/            # Halaman per modul: login, dashboard, talent, timesheet,
                    # workload, feasibility, budget, admin
src/components/     # Komponen bersama (shadcn/ui di components/ui)
src/lib/            # Supabase client + generated types
supabase/migrations # Migrasi SQL (append-only)
supabase/tests      # Tes RLS (SQL transaksional, di-rollback)
docs/               # Requirement document, panduan, README migrasi
CLAUDE.md           # Konteks & aturan untuk sesi Claude Code — baca sebelum develop
```

## Development dengan Claude Code

Repo ini dikembangkan dengan [Claude Code](https://docs.claude.com/en/docs/claude-code/overview). `CLAUDE.md` di root berisi aturan stack, keamanan, dan konvensi yang dibaca otomatis setiap sesi — perubahan arsitektur harus dicatat di sana. Tahapan pengembangan mengikuti 5 fase MVP di `docs/Panduan_Development_TANIA_ClaudeCode.md`.

## Lisensi & Kepemilikan

Internal PT Telkom Indonesia (Persero) Tbk — Digital Product, Chapter Product & Solution. Tidak untuk didistribusikan di luar Telkom Group.
