import type en from "../en/audit";

// Bahasa Indonesia: audit. Must define every key of the English catalog.
export default {
  "audit.title": "Log audit",
  "audit.description":
    "Tindakan administrator di gtcd, terbaru lebih dulu. gtcd menyimpan 90 hari, hingga 2.000 entri.",
  "audit.entries": "Tindakan",
  "audit.pageOf": "Halaman {page} dari {pages}",
  "audit.caption": "Tindakan administrator; waktu dalam {timezone}",
  "audit.time": "Waktu ({timezone})",
  "audit.actor": "Pengguna",
  "audit.action": "Tindakan",
  "audit.site": "Situs",
  "audit.target": "Sasaran",
  "audit.outcome": "Hasil",
  "audit.success": "Berhasil",
  "audit.failure": "Gagal",
  "audit.empty": "Belum ada tindakan tercatat",
  "audit.emptyDescription":
    "Perubahan situs, berbagi, ekspor, notifikasi, laporan dan administrasi bawaan muncul di sini.",
  "audit.unavailableTitle": "Log audit tidak tersedia",
  "audit.unavailable":
    "Penyimpanan tidak tersedia, jadi log audit tidak dapat dibaca. Coba lagi sebentar lagi.",
  "audit.actionExportCreate": "Memulai ekspor",
  "audit.actionNativeReveal": "Menampilkan token API",
  "audit.actionNativeSubmit": "Mengirim formulir administrasi",
  "audit.actionReportAlert": "Mengubah peringatan trafik",
  "audit.actionReportSchedule": "Mengubah laporan email",
  "audit.actionShareCreate": "Membuat tautan berbagi",
  "audit.actionShareRevoke": "Mencabut tautan berbagi",
  "audit.actionSiteCreate": "Membuat situs",
  "audit.actionSiteUpdate": "Memperbarui pengaturan situs",
} satisfies Record<keyof typeof en, string>;
