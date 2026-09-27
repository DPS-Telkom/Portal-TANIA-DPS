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

  if (error.code === "42501" || /only admin can change/i.test(msg))
    return "Anda tidak memiliki izin untuk perubahan ini. Hanya Admin yang dapat mengubah role, manager, atau status aktif.";
  if (/admin cannot change own role/i.test(msg))
    return "Admin tidak dapat mengubah role atau status aktif akunnya sendiri.";

  return "Terjadi kesalahan. Coba lagi.";
}
