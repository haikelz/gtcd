import type en from "../en/settings";

// Bahasa Indonesia: settings. Must define every key of the English catalog.
export default {
  "settings.accessToken": "Token akses",
  "settings.addSite": "Tambah situs",
  "settings.addSiteDescription":
    "Buat situs turunan untuk hostname analitik lain. Atur host-nya di reverse proxy GoatCounter sebelum situs bisa menerima data.",
  "settings.allowEmbed": "Origin embed yang diizinkan",
  "settings.allowEmbedHelp": "Izinkan satu origin tepercaya per baris.",
  "settings.analyticsHostname": "Hostname analitik",
  "settings.availableSites": "Situs tersedia",
  "settings.awaitingData": "Menunggu data",
  "settings.bosmangDescription": "Izinkan antarmuka Bosmang GoatCounter.",
  "settings.collectHelp":
    "Perubahan berlaku untuk kunjungan berikutnya. Data analitik yang sudah ada tidak dihapus.",
  "settings.collectHitsDescription":
    "Simpan tampilan halaman untuk ekspor CSV.",
  "settings.collectHitsLabel": "Tampilan halaman individual",
  "settings.collectLanguageDescription": "Catat bahasa yang didukung browser.",
  "settings.collectLanguageLabel": "Bahasa",
  "settings.collectLegend": "Data yang dikumpulkan",
  "settings.collectLocationDescription": "Catat negara pengunjung.",
  "settings.collectLocationLabel": "Negara",
  "settings.collectReferrerDescription":
    "Catat header perujuk dan parameter kampanye.",
  "settings.collectReferrerLabel": "Perujuk dan kampanye",
  "settings.collectRegionDescription":
    "Catat detail wilayah untuk negara yang dipilih.",
  "settings.collectRegionLabel": "Wilayah",
  "settings.collectRegions": "Negara dengan laporan per wilayah",
  "settings.collectRegionsHelp":
    "Kode negara dipisahkan koma, hanya untuk negara yang perlu detail wilayah.",
  "settings.collectScreenSizeDescription": "Catat dimensi viewport.",
  "settings.collectScreenSizeLabel": "Ukuran layar",
  "settings.collectSessionsDescription":
    "Perkirakan pengunjung unik dalam rentang hingga delapan jam.",
  "settings.collectSessionsLabel": "Sesi",
  "settings.collectUserAgentDescription":
    "Ambil nama browser dan sistem dari User-Agent tanpa menyimpan header-nya.",
  "settings.collectUserAgentLabel": "Browser dan sistem",
  "settings.counterImageAlt": "Jumlah pengunjung",
  "settings.counterPath": "Path penghitung",
  "settings.counterPathHelp":
    "Path halaman seperti {path}, atau {total} untuk seluruh situs.",
  "settings.counterUrl": "URL {format}",
  "settings.counterUrlLabel": "URL penghitung {format}",
  "settings.createPublicLink": "Buat tautan publik",
  "settings.createSite": "Buat situs",
  "settings.createSiteFailed": "GoatCounter tidak dapat membuat situs ini.",
  "settings.dataControls": "Kontrol data",
  "settings.dataControlsDescription":
    "Pilih berapa lama data analitik disimpan dan trafik mana yang diabaikan.",
  "settings.dataRetention": "Retensi data",
  "settings.dataRetentionHelp": "Isi 0 untuk menyimpan data tanpa batas waktu.",
  "settings.days": "hari",
  "settings.description":
    "Atur data yang disimpan GoatCounter dan tempat analitik Anda bisa ditampilkan.",
  "settings.embedSnippet": "Snippet embed",
  "settings.generate": "Buat",
  "settings.hostname": "Hostname",
  "settings.identityDescription":
    "Hubungkan situs analitik ini dengan website yang dikunjungi orang.",
  "settings.ignoreIps": "Alamat IP yang diabaikan",
  "settings.ignoreIpsHelp":
    "Kecualikan trafik internal dengan satu alamat IP atau rentang CIDR per baris.",
  "settings.ignoreIpsPlaceholder": "Satu IP atau CIDR per baris",
  "settings.invalidHostname": "Masukkan hostname analitik yang valid.",
  "settings.invalidSecret": "Token akses: gunakan 8 sampai 40 huruf dan angka.",
  "settings.invalidSettings": "Masukkan pengaturan situs yang valid.",
  "settings.invalidVisibility": "Pilih privat, tautan rahasia, atau publik.",
  "settings.linkDomainHelp":
    "Gunakan URL kanonis website yang diukur oleh situs ini.",
  "settings.linkedWebsiteUrl": "URL website tertaut",
  "settings.nativeAdmin": "Administrasi",
  "settings.nativeAdminDescription":
    "Kelola pengguna, token API, keamanan, impor, dan data halaman tanpa meninggalkan GTCD.",
  "settings.newLink": "Tautan baru",
  "settings.notSaved": "Pengaturan tidak tersimpan",
  "settings.optional": "(opsional)",
  "settings.publicDashboard": "Dasbor publik",
  "settings.publicDashboardDescription":
    "Ringkasan gtcd hanya-baca yang bisa dibuka siapa pun yang punya tautannya. Tanpa login, pengaturan, atau ekspor.",
  "settings.publicDashboardLink": "Tautan publik dasbor",
  "settings.publicLinkHelp":
    "Membuat tautan baru atau mencabutnya akan menonaktifkan tautan saat ini.",
  "settings.publicSetting": "Pengaturan publik",
  "settings.receivingData": "Menerima data",
  "settings.retention": "Retensi",
  "settings.retentionDays": "{count} hari",
  "settings.reviewField":
    "GoatCounter tidak dapat menyimpan pengaturan. Periksa kolom yang ditandai.",
  "settings.revoke": "Cabut",
  "settings.saveChanges": "Simpan perubahan",
  "settings.saveFailed": "GoatCounter tidak dapat menyimpan pengaturan ini.",
  "settings.saveForShareLink":
    "Simpan untuk mendapatkan tautan berbagi bagi token ini.",
  "settings.saveToEnableCounter": "Simpan untuk mengaktifkan penghitung.",
  "settings.saved": "Pengaturan situs disimpan.",
  "settings.secretHelp":
    "8 sampai 40 huruf dan angka. Token baru menonaktifkan tautan berbagi lama.",
  "settings.secretPlaceholder": "Dibuat saat disimpan",
  "settings.sendTestVisit": "Kirim kunjungan uji",
  "settings.seoDescription": "Kelola pengaturan situs GoatCounter.",
  "settings.seoTitle": "Pengaturan situs — gtcd",
  "settings.shareLink": "Tautan berbagi",
  "settings.shareLinkNeedsAdminUrl":
    "Atur {envVar} untuk mendapatkan tautan berbagi siap pakai.",
  "settings.sharing": "Berbagi dan penghitung",
  "settings.sharingDescription":
    "Atur tempat analitik bisa disematkan dan penghitung publik yang tersedia.",
  "settings.siteCreateFailed": "Situs tidak dibuat",
  "settings.siteCreatePermission":
    "Membuat situs membutuhkan izin site-create pada token API GoatCounter. Berikan izin site-create ke GOATCOUNTER_API_KEY yang dikonfigurasi, lalu muat ulang.",
  "settings.siteCreated": "Situs dibuat.",
  "settings.siteNotManageable": "Situs ini tidak bisa dikelola di sini.",
  "settings.siteReadPermission":
    "Pengaturan membutuhkan izin site-read pada token API GoatCounter. Berikan izin site-read dan site-update ke GOATCOUNTER_API_KEY yang dikonfigurasi, lalu muat ulang.",
  "settings.siteUpdatePermission":
    "Menyimpan pengaturan membutuhkan izin site-update pada token API GoatCounter. Berikan izin itu ke GOATCOUNTER_API_KEY yang dikonfigurasi, lalu muat ulang.",
  "settings.testVisitFailed": "Kunjungan uji gagal.",
  "settings.testVisitHelp":
    "Mencatat satu event berlabel untuk memastikan gtcd bisa menulis ke GoatCounter.",
  "settings.testVisitNeedsCount":
    "Token API GoatCounter membutuhkan izin count untuk mengirim kunjungan uji.",
  "settings.testVisitNotRecorded":
    "GoatCounter tidak dapat mencatat kunjungan uji.",
  "settings.testVisitRejected": "GoatCounter menolak kunjungan uji ({status}).",
  "settings.testVisitSent":
    "Kunjungan uji terkirim. Dalam satu menit, kunjungan ini muncul sebagai event gtcd-connection-test.",
  "settings.title": "Pengaturan situs",
  "settings.unlimited": "Tanpa batas",
  "settings.visibility": "Visibilitas dasbor",
  "settings.visibilityPrivate": "Privat",
  "settings.visibilityPrivateDescription":
    "Hanya pengguna GoatCounter yang sudah masuk yang bisa melihat dasbor.",
  "settings.visibilityPublic": "Publik",
  "settings.visibilityPublicDescription":
    "Siapa pun bisa melihat dasbor GoatCounter.",
  "settings.visibilitySecret": "Tautan rahasia",
  "settings.visibilitySecretDescription":
    "Siapa pun yang punya tautan berbagi bisa melihat dasbor.",
  "settings.visitorCounter": "Penghitung pengunjung",
  "settings.visitorCounterDescription": "Izinkan penghitung pengunjung publik.",
} satisfies Record<keyof typeof en, string>;
