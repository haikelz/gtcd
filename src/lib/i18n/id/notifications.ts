import type en from "../en/notifications";

// Bahasa Indonesia: notifications. Must define every key of the English
// catalog.
export default {
  "notifications.title": "Notifikasi",
  "notifications.description":
    "Kirim peringatan trafik dan ringkasan terjadwal situs ini ke Slack, Discord, Telegram atau webhook.",
  "notifications.back": "Pengaturan",
  "notifications.settingsDescription":
    "Peringatan trafik dan ringkasan untuk aplikasi chat dan webhook.",
  "notifications.open": "Kelola kanal",
  "notifications.listTitle": "Kanal",
  "notifications.listDescription":
    "Tujuan peringatan dan ringkasan untuk {site}.",
  "notifications.empty": "Belum ada kanal",
  "notifications.emptyDescription":
    "Tambahkan kanal untuk mengirim peringatan dan ringkasan di luar email.",
  "notifications.unavailableTitle": "Kanal tidak tersedia",
  "notifications.unavailable":
    "Penyimpanan tidak tersedia, jadi kanal tidak dapat dibaca atau diubah. Coba lagi sebentar lagi.",
  "notifications.typeSlack": "Slack",
  "notifications.typeDiscord": "Discord",
  "notifications.typeTelegram": "Telegram",
  "notifications.typeWebhook": "Webhook (JSON)",
  "notifications.alertEither":
    "Peringatan saat tayangan halaman berubah {threshold}% atau lebih",
  "notifications.alertIncrease":
    "Peringatan saat tayangan halaman naik {threshold}% atau lebih",
  "notifications.alertDecrease":
    "Peringatan saat tayangan halaman turun {threshold}% atau lebih",
  "notifications.lastSent": "Terakhir dikirim {date}.",
  "notifications.lastFailed":
    "Pengiriman terakhir gagal {date}. gtcd akan mencoba lagi nanti.",
  "notifications.failedBadge": "Gagal",
  "notifications.nothingSent": "Belum ada yang dikirim.",
  "notifications.sendTest": "Kirim pesan uji",
  "notifications.delete": "Hapus",
  "notifications.addTitle": "Tambah kanal",
  "notifications.addDescription":
    "gtcd menyamarkan URL webhook dan token bot setelah disimpan.",
  "notifications.type": "Jenis kanal",
  "notifications.name": "Nama",
  "notifications.nameHelp": "Tampil di daftar ini, misalnya #analytics.",
  "notifications.url": "URL webhook",
  "notifications.urlHelpSlack": "URL https:// dari incoming webhook Slack.",
  "notifications.urlHelpDiscord":
    "URL https:// dari pengaturan Integrasi kanal Discord.",
  "notifications.urlHelpWebhook":
    'gtcd mengirim JSON berisi "event", "site" dan "text" lewat POST ke URL https:// ini.',
  "notifications.botToken": "Token bot",
  "notifications.chatId": "ID chat",
  "notifications.telegramHelp":
    "Gunakan token dari @BotFather dan ID chat berupa angka atau @namakanal. Tambahkan bot ke chat terlebih dahulu.",
  "notifications.receives": "Kirim",
  "notifications.alerts": "Peringatan trafik harian",
  "notifications.summaries": "Ringkasan terjadwal",
  "notifications.receivesHelp":
    "Pesan mengikuti pengaturan bahasa dan angka Anda. Peringatan memeriksa hari sebelumnya; ringkasan mencakup periode penuh terakhir.",
  "notifications.add": "Tambah kanal",
  "notifications.limit":
    "Satu situs dapat memiliki hingga 10 kanal. Hapus salah satu terlebih dahulu.",
  "notifications.added":
    "Kanal ditambahkan. Pesan mulai dikirim pada periode berikutnya.",
  "notifications.deleted": "Kanal dihapus.",
  "notifications.testSent": "Pesan uji terkirim.",
  "notifications.testText":
    "Pesan uji dari gtcd untuk {site}. Peringatan trafik dan ringkasan situs ini akan dikirim ke sini.",
  "notifications.invalid": "Periksa isian kanal lalu coba lagi.",
  "notifications.nameInvalid": "Masukkan nama hingga 80 karakter.",
  "notifications.receivesInvalid":
    "Pilih peringatan trafik, ringkasan terjadwal atau keduanya.",
  "notifications.telegramInvalid":
    "Masukkan token bot dari @BotFather dan ID chat berupa angka atau @namakanal.",
  "notifications.urlInvalid": "Masukkan URL yang valid.",
  "notifications.urlProtocol": "Gunakan URL https://.",
  "notifications.urlCredentials":
    "Hapus nama pengguna dan kata sandi dari URL.",
  "notifications.urlPrivate":
    "URL ini mengarah ke alamat privat, lokal atau khusus. gtcd hanya mengirim ke host publik.",
  "notifications.urlUnresolved":
    "gtcd tidak dapat menemukan host ini. Periksa URL lalu coba lagi.",
  "notifications.saveFailed": "Kanal tidak tersimpan. Coba lagi sebentar lagi.",
  "notifications.notFound": "Kanal ini sudah tidak ada. Muat ulang halaman.",
  "notifications.testRefused":
    "Penerima menolak pesan uji (HTTP {status}). Periksa URL atau token.",
  "notifications.testFailed":
    "Pesan uji tidak dapat dikirim. Pastikan penerima dapat dijangkau dan menjawab dalam 10 detik.",
} satisfies Record<keyof typeof en, string>;
