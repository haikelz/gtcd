import type en from "../en/common";

// Bahasa Indonesia: common. Must define every key of the English catalog.
export default {
  "common.cancel": "Batal",
  "common.copy": "Salin",
  "common.loading": "Memuat",
  "common.reportLoadFailed": "Laporan ini gagal dimuat",
  "common.retry": "Coba lagi",
  "common.save": "Simpan",
  "common.unknown": "Tidak diketahui",
} satisfies Record<keyof typeof en, string>;
