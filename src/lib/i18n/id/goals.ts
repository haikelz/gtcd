// Indonesian messages: goals. Keys are "goals.<name>"; {param} placeholders.
export default {
  "goals.add": "Tambah sasaran",
  "goals.addTitle": "Tambah sasaran",
  "goals.adminOnly":
    "Hanya admin yang dapat menambah, mengganti nama, atau menghapus sasaran.",
  "goals.columnChange": "Perubahan",
  "goals.columnGoal": "Sasaran",
  "goals.columnRate": "Tingkat konversi",
  "goals.columnVisitors": "Pengunjung",
  "goals.created": "Sasaran ditambahkan.",
  "goals.delete": "Hapus",
  "goals.deleteLabel": "Hapus {name}",
  "goals.deleted": "Sasaran dihapus.",
  "goals.denominator":
    "Tingkat konversi adalah pengunjung sasaran dibagi {total} pengunjung dalam periode ini.",
  "goals.description":
    "Pengunjung yang mencapai event atau halaman, dan porsinya dari semua pengunjung.",
  "goals.duplicate": "Sasaran untuk event atau halaman ini sudah ada.",
  "goals.emptyAdmin":
    "Tambahkan event atau halaman di bawah untuk menghitung siapa yang mencapainya.",
  "goals.emptyTitle": "Belum ada sasaran",
  "goals.emptyViewer": "Admin dapat menambahkan sasaran untuk situs ini.",
  "goals.help":
    "Menghitung pengunjung yang mencapai setiap sasaran dalam periode ini. GoatCounter tidak mencatat sesi, jadi ini bukan funnel langkah demi langkah.",
  "goals.invalid":
    "Masukkan nama 1 sampai 60 karakter dan nama event atau path halaman.",
  "goals.invalidName": "Masukkan nama 1 sampai 60 karakter.",
  "goals.kind": "Jenis",
  "goals.kindEvent": "Event",
  "goals.kindPage": "Halaman",
  "goals.limit":
    "Situs ini sudah memiliki {limit} sasaran. Hapus satu untuk menambah yang lain.",
  "goals.loadFailed":
    "Hitungan sasaran tidak dapat dimuat. Coba lagi sebentar.",
  "goals.loading": "Memuat hitungan sasaran",
  "goals.manageDescription":
    "Maksimal {max} sasaran per situs. Menghapus sasaran tidak menghapus data GoatCounter.",
  "goals.manageTitle": "Kelola sasaran",
  "goals.name": "Nama",
  "goals.nameFor": "Nama untuk {path}",
  "goals.nav": "Sasaran",
  "goals.noVisitors": "Tidak ada pengunjung dalam periode ini",
  "goals.notCounted": "Tidak dihitung",
  "goals.notFound": "Sasaran ini sudah tidak ada. Muat ulang halaman.",
  "goals.path": "Nama event atau path halaman",
  "goals.pathHelp":
    "Gunakan nama yang ditampilkan GoatCounter, misalnya signup-click atau /pricing.",
  "goals.rename": "Simpan nama",
  "goals.renamed": "Nama sasaran diubah.",
  "goals.reportTitle": "Konversi sasaran",
  "goals.scanIncomplete":
    "Situs ini memiliki lebih dari {limit} path. Sasaran yang path-nya tidak termasuk {limit} path pertama tidak dihitung.",
  "goals.seoDescription": "Konversi sasaran untuk situs GoatCounter Anda.",
  "goals.seoTitle": "Sasaran",
  "goals.storageLoadFailed":
    "Sasaran tidak dapat dimuat karena penyimpanan tidak merespons. Coba lagi sebentar.",
  "goals.storageSaveFailed":
    "Penyimpanan tidak merespons, jadi tidak ada yang disimpan. Coba lagi sebentar.",
  "goals.tableCaption":
    "Pengunjung sasaran dan tingkat konversi dalam periode ini",
  "goals.title": "Sasaran",
} as const satisfies Record<`goals.${string}`, string>;
