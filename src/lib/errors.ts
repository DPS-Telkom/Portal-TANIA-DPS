// Maps Supabase/Postgres errors to friendly Bahasa Indonesia messages.
interface MaybeError {
  message?: string;
  code?: string;
}

export function friendlyError(error: MaybeError | null | undefined): string {
  if (!error) return "Terjadi kesalahan. Coba lagi.";
  const msg = error.message ?? "";

  if (/invalid login credentials/i.test(msg)) return "Email atau password salah.";
  if (/email not confirmed/i.test(msg))
    return "Email belum dikonfirmasi. Buka tautan konfirmasi di kotak masuk Anda.";
  if (/user already registered/i.test(msg)) return "Email ini sudah terdaftar. Silakan masuk.";
  if (/password should be at least/i.test(msg)) return "Password minimal 8 karakter.";
  if (/rate limit|too many requests/i.test(msg))
    return "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.";
  if (/captcha/i.test(msg)) return "Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi.";
  if (/failed to fetch|network/i.test(msg))
    return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";

  // Specific database guard messages first, then the generic permission case.
  if (/admin cannot change own role/i.test(msg))
    return "Admin tidak dapat mengubah role atau status aktif akunnya sendiri.";
  if (/only admin can change/i.test(msg))
    return "Hanya Admin yang dapat mengubah role, manager, atau status aktif.";
  if (/target level is set by/i.test(msg)) return "Target level ditetapkan oleh manager atau HR.";
  if (/only HR can verify/i.test(msg)) return "Hanya HR yang dapat memverifikasi sertifikasi.";
  if (/evidence is verified by/i.test(msg)) return "Evidence diverifikasi oleh manager atau HR, bukan oleh talent sendiri.";
  const field = msg.match(/not allowed to change profile field (\w+)/i)?.[1];
  if (field) return `Anda tidak berhak mengubah kolom profil "${field}".`;
  if (error.code === "42501") return "Anda tidak memiliki izin untuk perubahan ini.";

  return "Terjadi kesalahan. Coba lagi.";
}
