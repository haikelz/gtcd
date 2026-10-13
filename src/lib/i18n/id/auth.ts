import type en from "../en/auth";

// Bahasa Indonesia: auth. Must define every key of the English catalog.
export default {
  "auth.challengeError": "Pemeriksaan keamanan tidak dapat dimuat.",
  "auth.challengeFailed":
    "Pemeriksaan keamanan gagal. Selesaikan pemeriksaan lalu coba lagi.",
  "auth.challengeRetry": "Coba lagi",
  "auth.email": "Email",
  "auth.emailPlaceholder": "nama@contoh.com",
  "auth.footnote":
    "Analitik tetap terhubung ke instance GoatCounter Anda, jadi tidak perlu akun terpisah.",
  "auth.hidePassword": "Sembunyikan kata sandi",
  "auth.intro": "Masuk dengan akun GoatCounter yang sudah ada.",
  "auth.invalidCredentials": "Email atau kata sandi salah",
  "auth.mfaRequired":
    "Akun ini memakai autentikasi dua faktor. Nonaktifkan TOTP atau buka dasbor GoatCounter langsung.",
  "auth.missingCredentials": "Masukkan email dan kata sandi",
  "auth.password": "Kata sandi",
  "auth.passwordPlaceholder": "Kata sandi GoatCounter",
  "auth.seoDescription":
    "Masuk dengan akun GoatCounter untuk membuka dasbor analitik.",
  "auth.showPassword": "Tampilkan kata sandi",
  "auth.signIn": "Masuk",
  "auth.signingIn": "Sedang masuk…",
  "auth.tooManyAttempts":
    "Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.",
  "auth.unavailable": "GoatCounter sedang tidak tersedia. Coba lagi nanti.",
  "auth.welcome": "Selamat datang kembali",
} satisfies Record<keyof typeof en, string>;
