# TANIA for Dummies 🚀
### Panduan step-by-step membangun Platform TANIA dengan Claude Code — tanpa perlu jago coding

**Rute:** Repo di **GitHub** → Database di **Supabase** → Production di **Vercel** (tania.vercel.app)
**Fitur:** Halaman HOME publik (penjelasan TANIA + tombol LOGIN), registrasi user baru, dan akses berbasis role (RBAC): **Admin, Executive, Chapter Leader, Manager, Talent, Guest**.

> Panduan ini menganggap Anda belum pernah pakai alat-alat ini. Setiap langkah dijelaskan: apa yang diketik, apa yang diklik, dan bagaimana tahu Anda berhasil. Ikuti berurutan — jangan lompat.

**Perubahan vs dokumen sebelumnya** (dicatat supaya jujur & konsisten):
1. Hosting production: **Vercel** menggantikan Netlify. Ini malah lebih sederhana — Vercel pembuat Next.js, tanpa sistem kredit deploy.
2. Auth: sebelumnya *invite-only*; sekarang **registrasi dibuka**, tapi user baru otomatis menjadi **Guest** (nyaris tanpa akses) sampai Admin memberi role. Aman dan tetap terkendali.
3. Role baru **Guest** ditambahkan ke sistem. Role **pm** (Project Manager) tetap ada di database untuk modul Feasibility — anggap ia varian dari Manager.

---

## 📖 Kamus Singkat (baca 2 menit)

| Istilah | Artinya |
|---|---|
| **Terminal** | Aplikasi di MacBook untuk mengetik perintah. Buka: tekan `Cmd+Space`, ketik "Terminal", Enter |
| **Repo (repository)** | "Folder proyek" yang tersimpan di GitHub, lengkap dengan riwayat perubahan |
| **Claude Code** | Asisten AI di Terminal yang menulis kode untuk Anda — Anda memberi instruksi bahasa biasa (disebut *prompt*) |
| **Migrasi** | File berisi perintah pembuatan tabel database, dijalankan berurutan |
| **RLS** | Row Level Security — aturan di database yang menentukan siapa boleh melihat data apa. Ini "satpam" TANIA |
| **Deploy** | Menerbitkan aplikasi ke internet supaya bisa diakses orang lain |
| **Env vars** | "Kunci rahasia" aplikasi (alamat & password database) yang disimpan terpisah dari kode |

Simbol: `$` = ketik di Terminal lalu Enter · 💬 = ketik/paste ke Claude Code · ✅ = tanda Anda berhasil · 🆘 = kalau macet.

---

## BAGIAN A — Buat 4 Akun (±20 menit, semua gratis)

1. **GitHub** → github.com → Sign up. Ini rumah kode Anda.
2. **Supabase** → supabase.com → "Sign in with GitHub" (pakai akun barusan). Ini database Anda.
3. **Vercel** → vercel.com → "Continue with GitHub". Ini hosting Anda. Pilih plan **Hobby** (gratis).
4. **Claude** → claude.ai — pastikan Anda punya langganan Pro/Max (dibutuhkan Claude Code).

> ⚠️ **Catatan jujur tentang Vercel Hobby:** gratis dan sangat memadai (100 GB bandwidth/bulan, deploy tak berjatah), tapi syarat resminya *non-commercial/personal use*. Untuk pilot internal chapter umumnya tidak dipersoalkan, namun bila TANIA menjadi sistem resmi Telkom, rencanakan Vercel Pro ($20/bln) atau infrastruktur korporat. Ini keputusan yang perlu Anda sadari sejak awal, bukan kejutan belakangan.

✅ Anda bisa login ke keempat situs.

---

## BAGIAN B — Pasang Alat di MacBook (±20 menit, sekali seumur proyek)

Buka Terminal, ketik satu per satu (tunggu tiap perintah selesai):

```bash
$ node -v
```
Kalau muncul `v20.x` atau lebih → lanjut. Kalau "command not found" → install dulu dari nodejs.org (unduh installer macOS, klik-klik Next).

```bash
$ npm install -g @anthropic-ai/claude-code
$ brew install supabase/tap/supabase
$ brew install git
```
🆘 "brew: command not found" → install Homebrew dulu: buka brew.sh, salin satu baris perintah instalasinya ke Terminal.

Cek semua terpasang:
```bash
$ claude --version && supabase --version && git --version
```
✅ Tiga-tiganya menampilkan angka versi.

Terakhir, kenalkan diri ke git (ganti dengan data Anda):
```bash
$ git config --global user.name "Henri Setiawan"
$ git config --global user.email "email-anda@telkom.co.id"
```

---

## BAGIAN C — Buat Repo di GitHub & Ambil ke MacBook (±10 menit)

1. Di github.com klik tombol **+** (kanan atas) → **New repository**.
2. Nama: `tania-portal` · pilih **Private** · centang "Add a README" → **Create repository**.
3. Di halaman repo, klik tombol hijau **Code** → tab **HTTPS** → salin alamatnya.
4. Di Terminal:
   ```bash
   $ cd ~/Documents
   $ git clone https://github.com/USERNAME-ANDA/tania-portal.git
   $ cd tania-portal
   ```
   (Saat diminta password, GitHub meminta *Personal Access Token* — buat di github.com → Settings → Developer settings → Tokens (classic) → Generate, centang "repo", salin, tempel sebagai password.)
5. Salin semua artefak TANIA yang sudah Anda punya ke folder ini:
   - `CLAUDE.md`, `README.md` → langsung di dalam `tania-portal/`
   - `PRD.md` dan dokumen lain → ke subfolder `docs/`
   - 5 file migrasi `.sql` → ke `supabase/migrations/`
   - `index.ts` (Edge Function v2) → ke `supabase/functions/tania-assistant/`
6. Simpan ke GitHub:
   ```bash
   $ git add -A
   $ git commit -m "chore: dokumen, migrasi, dan konteks Claude Code"
   $ git push
   ```
✅ Refresh halaman repo di GitHub — semua file terlihat di sana.

---

## BAGIAN D — Nyalakan Database Supabase (±30 menit)

1. supabase.com → **New Project**: nama `tania`, password database (klik Generate, **simpan di catatan aman**), region **Southeast Asia (Singapore)** → Create.
2. Tunggu ±2 menit. Lalu buka **Settings → API**, catat 3 hal: **Project URL**, **anon public key**, **Project ref** (kode pendek di URL).
3. Sambungkan & jalankan migrasi dari Terminal:
   ```bash
   $ supabase login          # browser terbuka, klik Authorize
   $ supabase link --project-ref KODE-REF-ANDA
   $ supabase db push        # membuat semua tabel + aturan keamanan
   ```
   ✅ Terminal menyebut 5 migrasi "applied".
   🆘 Ada error? Jangan panik — lanjut ke Bagian E dulu, nanti minta Claude Code memperbaikinya (tempelkan pesan errornya).
4. **Buat akun Anda sendiri**: Dashboard → **Authentication → Add user** → email Anda → Create.
5. **Angkat diri jadi Admin**: menu **SQL Editor** → New query → tempel & Run:
   ```sql
   update public.profiles set role = 'admin', full_name = 'Nama Anda'
   where email = 'email-anda@telkom.co.id';
   ```
6. **Biarkan self-signup MENYALA** (default) — berbeda dari panduan lama, karena kita akan pakai pola Guest: siapa pun boleh mendaftar, tapi masuk sebagai Guest tanpa akses sampai Admin memberi role.

---

## BAGIAN E — Sesi Claude Code #1: Role Guest + HOME + Login/Registrasi (±2–3 jam)

Mulai Claude Code di folder proyek:
```bash
$ cd ~/Documents/tania-portal
$ claude
```
(Pertama kali: ikuti proses login di browser.)

Cara memakai Claude Code: ketik instruksi, tekan Enter, ia bekerja dan bertanya bila perlu — jawab saja. Kalau ia minta izin menjalankan perintah, baca sekilas lalu setujui. Satu instruksi selesai dulu sebelum instruksi berikutnya.

💬 **Prompt 1 — migrasi role Guest (fondasi RBAC baru):**
> Baca CLAUDE.md dan docs/PRD.md. Buat migrasi Supabase baru: (1) tambah nilai 'guest' ke enum user_role; (2) ubah default kolom profiles.role menjadi 'guest' sehingga pendaftar baru otomatis Guest; (3) perketat RLS: semua policy SELECT yang saat ini `using (true)` untuk authenticated (profiles, skills, profile_skills, projects, activities, allocations, feasibility_cases) diubah agar role 'guest' TIDAK bisa membaca apa pun kecuali baris profil miliknya sendiri; (4) pastikan guest tetap bisa update nama di profilnya. Jalankan supabase db push dan regenerate database.types.ts. Ingat: enum ADD VALUE di Postgres harus di-commit sebelum dipakai — pisahkan ke dua migrasi bila perlu.

💬 **Prompt 2 — inisialisasi aplikasi:**
> Inisialisasi Next.js (App Router, TypeScript, Tailwind) di repo ini dengan `output: 'export'` dan `images.unoptimized: true`, pasang shadcn/ui dan @supabase/supabase-js, buat `.env.example` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) dan pastikan `.env.local` masuk .gitignore. Verifikasi `npm run build` sukses.

Lalu buat file `.env.local` (Claude Code bisa diminta membuatkannya) dan isi dua nilai dari Bagian D langkah 2.

💬 **Prompt 3 — halaman HOME publik + login + registrasi:**
> Buat halaman HOME publik di route `/` yang bisa diakses TANPA login: hero section dengan nama besar "TANIA — Talent · Analytics · Insight · Action", penjelasan singkat platform (ambil ringkasan dari docs/PRD.md Section 1: management cockpit DPS dengan 6 modul: Talent, Workload, Timesheet, Feasibility, Budget, Copilot AI), tiga kartu keunggulan, dan tombol LOGIN mencolok warna Telkom #E1231A di kanan atas dan di hero. Tombol LOGIN membuka halaman `/login` berisi dua tab: "Masuk" (email+password) dan "Daftar" (nama lengkap, email, password — sign up Supabase dengan full_name di metadata). Setelah daftar/masuk: role guest diarahkan ke halaman `/menunggu-akses` yang ramah ("Akun Anda menunggu persetujuan Admin") dengan tombol logout; role lain diarahkan ke `/dashboard`. Semua UI Bahasa Indonesia.

💬 **Prompt 4 — shell aplikasi ber-role + halaman Admin:**
> Buat layout aplikasi (untuk semua route selain /, /login, /menunggu-akses) dengan sidebar sesuai role dari profiles.role: admin & chapter_lead & executive melihat semua menu (Dashboard, Talent, Timesheet, Workload, Feasibility, Budget, Admin khusus admin); manager tanpa Budget penuh; talent hanya Dashboard, Talent, Timesheet, Workload; guest selalu dilempar ke /menunggu-akses. Ingat cek role di frontend hanyalah kenyamanan — RLS tetap pagar sebenarnya. Lalu buat halaman /admin: tabel semua user dengan dropdown ubah role (guest→talent/manager/dst) dan set manager — sertakan penjelasan bahwa perubahan role hanya berhasil untuk admin karena trigger database. Jalankan npm run build sampai hijau.

✅ **Uji ceritanya:** buka `localhost:3000` tanpa login → HOME tampil → klik LOGIN → tab Daftar → buat akun percobaan → masuk sebagai Guest → terdampar di "menunggu akses" → di tab lain login sebagai Admin → ubah role si percobaan jadi Talent → si percobaan refresh → masuk dashboard. Kalau alur ini jalan, RBAC Anda hidup.

Simpan progres:
```bash
$ git add -A && git commit -m "feat: home publik, registrasi, RBAC guest (AV/XM fondasi)" && git push
```

---

## BAGIAN F — Bangun Modul Inti (1 sesi per modul, ±1 minggu santai)

Pakai prompt siap-copy yang sudah ada di dua dokumen ini — urutannya sama, tinggal ikuti:
1. **Timesheet → Talent & Workload → Feasibility & Budget → Dashboard + Copilot**: prompt lengkap ada di `docs/TANIA_MVP_Demo_Local_MacBook.md` (Hari 2–4), termasuk seed data demo supaya tampilan langsung hidup.
2. Untuk **Copilot** jangan lupa dua perintah ini sebelum prompt widget-nya:
   ```bash
   $ supabase secrets set ANTHROPIC_API_KEY=sk-ant-KUNCI-ANDA
   $ supabase functions deploy tania-assistant
   ```
   (Kunci dibuat di console.anthropic.com — pasang *spend limit* $5/bulan di sana. Ini satu-satunya komponen berbayar, hitungannya puluhan ribu rupiah per bulan.)

Kebiasaan baik tiap sesi: mulai dengan 💬 *"Baca CLAUDE.md"* · satu modul selesai → `git add -A && git commit && git push` · ganti topik → ketik `/clear`.

---

## BAGIAN G — Terbitkan ke Internet via Vercel (±20 menit)

Inilah enaknya Vercel: sekali disambung, **setiap `git push` otomatis ter-deploy**.

1. vercel.com → **Add New → Project** → pilih repo `tania-portal` → Import.
2. Vercel mendeteksi Next.js otomatis. Buka **Environment Variables**, tambahkan dua kunci:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL Anda
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key Anda
3. Klik **Deploy**. Tunggu ±2 menit. ✅ Anda mendapat alamat `https://tania-portal-xxx.vercel.app` — buka dari HP Anda: HOME tampil, coba daftar & login.
4. Rapikan alamat: Project → Settings → Domains → ubah menjadi `tania.vercel.app` (kalau masih tersedia) atau `tania-dps.vercel.app`.
5. Kencangkan dua hal keamanan (minta Claude Code):
   💬 *"Ganti Access-Control-Allow-Origin di supabase/functions/tania-assistant/index.ts dari * menjadi https://ALAMAT-VERCEL-ANDA, lalu beri aku perintah deploy ulang function-nya."*
6. Otomasi penjaga gratis (masih perlu, tak tergantung hosting):
   💬 *"Buat .github/workflows/keepalive.yml: ping Supabase tiap 3 hari (anti auto-pause free tier) + backup mingguan supabase db dump sebagai artifact. Beri tahu aku secrets apa yang harus kuisi di GitHub → Settings → Secrets."*

> Catatan deploy Vercel vs arsitektur kita: TANIA tetap **static export** (aturan CLAUDE.md tidak berubah) — di Vercel ia tersaji sebagai situs statis biasa. Jangan tergoda menyalakan fitur server Vercel; arsitektur zero-cost kita bergantung pada frontend statis + RLS.

---

## BAGIAN H — Checklist Sebelum Dipakai Chapter

- [ ] Uji 4 role di alamat production: Guest terdampar di menunggu-akses; Talent tak melihat & tak bisa membaca Budget; Manager bisa approve; Admin bisa ubah role.
- [ ] Registrasi memakai email liar → pastikan hanya jadi Guest. (Opsional lebih ketat: 💬 minta Claude Code membatasi pendaftaran hanya email `@telkom.co.id`.)
- [ ] Copilot: tanya data sebagai Talent tentang budget → ditolak sopan.
- [ ] Spend limit Anthropic terpasang; workflow keep-alive & backup hijau di tab Actions GitHub.
- [ ] Umumkan alamat ke chapter + kebijakan: timesheet disubmit tiap Jumat.

---

## 🆘 Kalau Macet — 3 Jurus Universal

1. **Salin-tempel error ke Claude Code** apa adanya: 💬 *"Perintah X gagal dengan error ini: [tempel]. Perbaiki tanpa melanggar aturan di CLAUDE.md."* — 90% masalah selesai di sini.
2. Layar aneh setelah banyak perubahan? `Ctrl+C` untuk hentikan `npm run dev`, jalankan lagi.
3. Merasa kacau total? Tenang, semuanya di GitHub: 💬 *"Kembalikan project ke kondisi commit terakhir yang berhasil."*

Selamat membangun — dari HOME publik sampai copilot AI, semuanya kini satu alur: tulis prompt, review, commit, push, dan Vercel menerbitkannya otomatis. 🎉
