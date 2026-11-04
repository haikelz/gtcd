import type en from "../en/admin";

// Bahasa Indonesia: admin. Must define every key of the English catalog.
export default {
  "admin.access": "Akses",
  "admin.allUsers": "Semua pengguna",
  "admin.confirm":
    "Saya konfirmasi: {title}. Tindakan ini mengubah data tersimpan atau akses akun dan mungkin tidak bisa dibatalkan.",
  "admin.emailReadOnly":
    "Alamat masuk Anda tidak bisa diubah di sini. Administrator dapat mengubahnya di Pengguna.",
  "admin.hideToken": "Sembunyikan token",
  "admin.importDescription":
    "Gunakan file CSV atau CSV.gz dari GoatCounter, maksimal 8 MB (32 MB setelah diekstrak). Impor Google Analytics hanya menambahkan total, bukan riwayat pengunjung lengkap. Unggahan yang diterima diproses di latar belakang, jadi diterima belum berarti impor selesai. Mengganti data akan menghapus tampilan halaman yang sudah ada.",
  "admin.importTitle": "Sebelum mengimpor",
  "admin.messageError": "Periksa permintaan Anda",
  "admin.messageInfo": "Respons GoatCounter",
  "admin.noControlsDescription":
    "Akun Anda mungkin tidak punya akses, atau versi GoatCounter ini memakai formulir yang berbeda. Token API juga memerlukan alamat email yang sudah diverifikasi. Belum ada perubahan yang dikirim.",
  "admin.noControlsTitle": "Tidak ada kontrol administrasi",
  "admin.notFound": "Halaman administrasi tidak ditemukan.",
  "admin.open": "Buka administrasi",
  "admin.problemDenied":
    "Akun GoatCounter Anda tidak punya izin untuk melakukan perubahan ini.",
  "admin.problemInvalid":
    "Formulir ini sudah tidak berlaku. Muat ulang halaman, periksa isian Anda, lalu konfirmasi tindakan lagi. File impor harus berupa CSV atau CSV.gz, maksimal 8 MB.",
  "admin.problemReauthenticate":
    "Sesi GoatCounter Anda sudah berakhir. Keluar lalu masuk lagi untuk melanjutkan.",
  "admin.problemUnavailable":
    "GoatCounter tidak dapat menyelesaikan permintaan. Periksa keadaan terkini sebelum mencoba lagi.",
  "admin.reconnect": "Keluar dan sambungkan ulang",
  "admin.required": "Diperlukan akses administrator.",
  "admin.revealToken": "Tampilkan token: {name}",
  "admin.revealedTokenDescription":
    "Simpan kredensial ini secara pribadi. Token hanya ditampilkan setelah Anda memintanya.",
  "admin.revealedTokenTitle": "Token API yang ditampilkan",
  "admin.sectionImports": "Impor data",
  "admin.sectionImportsDescription":
    "Unggah data tampilan halaman lama ke situs GoatCounter yang dipilih.",
  "admin.sectionPages": "Data halaman",
  "admin.sectionPagesDescription":
    "Cari path yang tercatat, lalu hapus atau gabungkan tampilan halamannya. Situs web Anda tidak ikut berubah.",
  "admin.sectionPreferences": "Preferensi GoatCounter",
  "admin.sectionPreferencesDescription":
    "Perbarui pengaturan tampilan akun GoatCounter dan laporan email GoatCounter. Preferensi tampilan dan laporan terjadwal GTCD diatur terpisah.",
  "admin.sectionSecurity": "Keamanan akun",
  "admin.sectionSecurityDescription":
    "Ubah kata sandi dan kelola autentikasi dua faktor.",
  "admin.sectionTokens": "Token API",
  "admin.sectionTokensDescription":
    "Buat kredensial untuk integrasi dan cabut token yang tidak lagi dipakai.",
  "admin.sectionUsers": "Pengguna",
  "admin.sectionUsersDescription": "Kelola akses ke situs GoatCounter ini.",
  "admin.seoTitle": "{section} — Administrasi",
  "admin.submitting": "Mengirim…",
  "admin.tableCaption": "{section} di GoatCounter",
  "admin.title": "Administrasi",
  "admin.tokenLabel": "Token API",
  "admin.totpSetupHelp":
    "Tambahkan kunci penyiapan ini ke aplikasi autentikator, lalu masukkan kode enam digitnya. Simpan kunci ini secara pribadi karena GoatCounter tidak menyediakan kode pemulihan.",
  "admin.totpSetupKey": "Kunci penyiapan autentikator",
  "admin.unavailableTitle": "Administrasi tidak tersedia",
} satisfies Record<keyof typeof en, string>;
