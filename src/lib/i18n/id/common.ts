import type en from "../en/common";

export default {
  "common.bodyTooLarge":
    "Permintaan ini terlalu besar. Kirim paling banyak 512 KiB.",
  "common.copy": "Salin",
  "common.endBeforeStart":
    "Tanggal akhir harus sama dengan atau setelah tanggal mulai.",
  "common.filterLimit":
    "Situs ini memiliki lebih dari {limit} path, batas untuk penyaringan path. Hapus filter untuk melihat laporan ini.",
  "common.invalidDates": "Pilih tanggal mulai dan akhir yang valid.",
  "common.invalidPage": "Pilih halaman laporan yang valid.",
  "common.rateLimited":
    "GoatCounter sedang membatasi permintaan. Tunggu beberapa detik, lalu coba lagi.",
  "common.reportLoadFailed": "Laporan ini gagal dimuat",
  "common.retry": "Coba lagi",
  "common.tokenSiteAccess":
    "Token API gtcd tidak dapat membaca situs ini. Admin dapat memperbaikinya lewat peringatan token API di Pengaturan.",
  "common.upstreamError":
    "GoatCounter menjawab dengan galat. Coba lagi; jika terus gagal, periksa log GoatCounter.",
  "common.upstreamUnavailable":
    "GoatCounter tidak merespons. Coba lagi sebentar lagi.",
} satisfies Record<keyof typeof en, string>;
