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
  "auth.forgotPassword": "Lupa kata sandi?",
  "auth.hidePassword": "Sembunyikan kata sandi",
  "auth.intro": "Masuk dengan akun GoatCounter yang sudah ada.",
  "auth.invalidCredentials": "Email atau kata sandi salah",
  "auth.mfaBack": "Gunakan akun lain",
  "auth.mfaCode": "Kode autentikasi",
  "auth.mfaExpired":
    "Sesi masuk kedaluwarsa. Masukkan email dan kata sandi lagi.",
  "auth.mfaIntro":
    "Masukkan kode 6 digit dari aplikasi autentikator untuk {email}.",
  "auth.mfaInvalid":
    "Kode tidak valid. Periksa aplikasi autentikator lalu coba lagi.",
  "auth.mfaTitle": "Autentikasi dua faktor",
  "auth.mfaVerify": "Verifikasi",
  "auth.mfaVerifying": "Memverifikasi…",
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
