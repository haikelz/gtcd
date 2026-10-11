import type en from "../en/exports";

// Bahasa Indonesia: exports. Must define every key of the English catalog.
export default {
  "exports.createDescription":
    "GoatCounter menyiapkan file terkompresi gzip di latar belakang.",
  "exports.createExport": "Buat ekspor",
  "exports.csvCursorHelp":
    "Tempel ID hit terakhir dari ekspor CSV sebelumnya agar hanya tampilan halaman yang lebih baru yang diunduh.",
  "exports.csvDescription":
    "Tampilan halaman individual untuk spreadsheet dan alat olah data.",
  "exports.description":
    "Kemas data analitik GoatCounter untuk alur pelaporan Anda sendiri.",
  "exports.download": "Unduh {format}",
  "exports.fileSize": "Ukuran file",
  "exports.format": "Format",
  "exports.goatCounterError": "GoatCounter melaporkan error",
  "exports.invalidCursor": "Kursor CSV harus berupa bilangan bulat positif.",
  "exports.invalidFormat": "Pilih format ekspor.",
  "exports.invalidStartDate": "Pilih tanggal mulai ekspor JSON yang valid.",
  "exports.jobSummary": "Ekspor #{id}, file {format}.",
  "exports.jsonDateHelp":
    "Kosongkan untuk menyertakan semua data agregat, atau pilih tanggal agar hanya data yang lebih baru yang diekspor.",
  "exports.jsonDescription":
    "Data agregat untuk cadangan analitik yang portabel.",
  "exports.limitsHelp":
    "Satu permintaan ekspor per jam. File yang selesai tersedia selama 24 jam.",
  "exports.notFound": "Ekspor tidak ditemukan.",
  "exports.notRequested": "Ekspor gagal diminta",
  "exports.optional": "(opsional)",
  "exports.permission":
    "Ekspor membutuhkan izin export pada token API GoatCounter.",
  "exports.permissionReload":
    "Ekspor membutuhkan izin export pada token API GoatCounter. Berikan izin export ke GOATCOUNTER_API_KEY, lalu muat ulang.",
  "exports.preparingDescription":
    "Muat ulang status untuk melihat apakah file sudah siap diunduh.",
  "exports.preparingTitle": "GoatCounter sedang menyiapkan ekspor ini",
  "exports.refreshStatus": "Muat ulang status",
  "exports.rowsIncluded": "Baris yang disertakan",
  "exports.seoDescription": "Ekspor data analitik GoatCounter.",
  "exports.seoTitle": "Ekspor — gtcd",
  "exports.startAfterHitId": "Mulai setelah ID hit",
  "exports.startDate": "Tanggal mulai",
  "exports.stateFailed": "Ekspor gagal",
  "exports.statePreparing": "Menyiapkan ekspor",
  "exports.stateReady": "Siap diunduh",
  "exports.statusDescription":
    "Progres dan unduhan ekspor yang diminta tampil di sini.",
  "exports.statusTitle": "Status ekspor",
  "exports.stepCreateDescription":
    "Pilih CSV untuk tampilan halaman individual atau JSON untuk data agregat.",
  "exports.stepCreateTitle": "Buat ekspor",
  "exports.stepDownloadDescription":
    "File yang selesai tersedia melalui dasbor terlindungi ini.",
  "exports.stepDownloadTitle": "Unduh dengan aman",
  "exports.stepWaitDescription":
    "Permintaan berjalan di GoatCounter, jadi tidak mengganggu penggunaan dasbor.",
  "exports.stepWaitTitle": "Tunggu persiapan",
  "exports.title": "Ekspor data",
} satisfies Record<keyof typeof en, string>;
