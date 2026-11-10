import type en from "../en/common";

// Bahasa Indonesia: common. Must define every key of the English catalog.
export default {
  "common.copy": "Salin",
  "common.filterLimit":
    "Situs ini memiliki lebih dari {limit} path, batas untuk penyaringan path. Hapus filter untuk melihat laporan ini.",
  "common.rateLimited":
    "GoatCounter sedang membatasi permintaan. Tunggu beberapa detik, lalu coba lagi.",
  "common.reportLoadFailed": "Laporan ini gagal dimuat",
  "common.retry": "Coba lagi",
  "common.upstreamError":
    "GoatCounter menjawab dengan galat. Coba lagi; jika terus gagal, periksa log GoatCounter.",
  "common.upstreamUnavailable":
    "GoatCounter tidak merespons. Coba lagi sebentar lagi.",
} satisfies Record<keyof typeof en, string>;
