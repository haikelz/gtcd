import type en from "../en/email";

// Bahasa Indonesia: email. Must define every key of the English catalog.
export default {
  "email.trafficSubject": "Peringatan trafik: {site}",
  "email.trafficHeadline":
    "Tayangan halaman berubah {change} pada {date} dibanding sehari sebelumnya.",
  "email.trafficCounts": "{current} tayangan halaman, sebelumnya {previous}.",
  "email.trafficFailed":
    "Peringatan trafik tidak dapat diperiksa atau dikirim. Pemeriksaan berikutnya akan mencoba lagi. Periksa akses GoatCounter dan pengaturan SMTP.",
  "email.headlineChange": "Kunjungan {change} dibanding periode sebelumnya",
  "email.headlineCount": "{count} kunjungan",
  "email.headlineCountChange": "{count} kunjungan ({change})",
  "email.headlineSummary": "Ringkasan kunjungan",
  "email.manage": "Ubah atau hentikan email ini",
  "email.manageFallback":
    "Ubah atau hentikan email ini di halaman Sesuaikan pada gtcd.",
  "email.manageUrl": "Ubah atau hentikan email ini: {url}",
  "email.noData": "Belum ada data",
  "email.noTotals": "GoatCounter tidak mengembalikan total untuk laporan ini.",
  "email.openDashboard": "Buka dasbor",
  "email.openDashboardUrl": "Buka dasbor: {url}",
  "email.reportBiweekly": "Laporan dua mingguan",
  "email.reportDaily": "Laporan harian",
  "email.reportFor": "{report} untuk {site}",
  "email.reportMonthly": "Laporan bulanan",
  "email.reportWeekly": "Laporan mingguan",
  "email.sendFailed": "Pengiriman gagal.",
  "email.siteUnavailable":
    "Situs GoatCounter untuk laporan ini tidak dapat diakses.",
  "email.subject": "{title}: {headline}",
  "email.topCountries": "Negara teratas",
  "email.topPages": "Halaman teratas",
  "email.topReferrers": "Perujuk teratas",
  "email.unknown": "Tidak diketahui",
} satisfies Record<keyof typeof en, string>;
