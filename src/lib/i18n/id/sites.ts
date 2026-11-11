// Indonesian messages: sites. Keys are "sites.<name>"; {param} placeholders.
export default {
  "sites.columnSite": "Situs",
  "sites.columnVisits": "Kunjungan",
  "sites.count": "{count} situs",
  "sites.day": "Hari",
  "sites.description":
    "Kunjungan untuk setiap situs yang dapat dibaca token API. Buka situs untuk melihat ringkasannya.",
  "sites.list": "Situs",
  "sites.loadFailed": "Kunjungan tidak dapat dimuat. Coba lagi sebentar.",
  "sites.loading": "Memuat kunjungan untuk {site}",
  "sites.nav": "Semua situs",
  "sites.seoDescription": "Kunjungan untuk setiap situs GoatCounter.",
  "sites.seoTitle": "Semua situs",
  "sites.tableCaption": "Kunjungan harian untuk {site}",
  "sites.title": "Semua situs",
  "sites.trendDescription": "Kunjungan harian dari {start} sampai {end}.",
  "sites.trendLabel": "Tren kunjungan untuk {site}",
} as const satisfies Record<`sites.${string}`, string>;
