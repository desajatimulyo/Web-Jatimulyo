function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Gunakan permintaan POST.", code: "METHOD_NOT_ALLOWED" })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  try {
    if (!event || !event.postData || typeof event.postData.contents !== "string" || event.postData.contents.length > 4096) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Permintaan tidak valid.", code: "BAD_REQUEST" })).setMimeType(ContentService.MimeType.JSON);
    }

    const permintaan = JSON.parse(event.postData.contents);
    if (!permintaan || Array.isArray(permintaan) || typeof permintaan !== "object") {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Permintaan tidak valid.", code: "BAD_REQUEST" })).setMimeType(ContentService.MimeType.JSON);
    }

    const action = String(permintaan.action || "");
    const actionValid = ["register", "checkStatus", "updateStatus", "getAllData"];
    if (!actionValid.includes(action)) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Aksi tidak dikenal.", code: "UNKNOWN_ACTION" })).setMimeType(ContentService.MimeType.JSON);
    }

    // Semua aksi admin memakai password yang sama. Kunci dulu diverifikasi,
    // baru blokir: hanya kunci yang salah yang dihitung dan dibatasi.
    let kunciAdminDiterima = false;
    if (["getAllData", "updateStatus"].includes(action) || (action === "register" && String(permintaan.jalur || "Online").trim() === "Offline")) {
      const properties = PropertiesService.getScriptProperties();
      const adminState = properties.getProperties();

      const passwordDiterima = String(permintaan.adminKey || "").trim();
      const passwordTersimpan = String(adminState.ADMIN_KEY || "").trim();
      if (passwordTersimpan.length < 32) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, message: "ADMIN_KEY belum diatur dengan minimal 32 karakter.", code: "SERVER_CONFIG" })).setMimeType(ContentService.MimeType.JSON);
      }

      const hashDiterima = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, passwordDiterima, Utilities.Charset.UTF_8);
      const hashTersimpan = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, passwordTersimpan, Utilities.Charset.UTF_8);
      let perbedaan = hashDiterima.length ^ hashTersimpan.length;
      for (let index = 0; index < Math.max(hashDiterima.length, hashTersimpan.length); index++) {
        perbedaan |= (hashDiterima[index] || 0) ^ (hashTersimpan[index] || 0);
      }

      if (passwordDiterima.length < 32 || passwordDiterima.length > 128 || perbedaan !== 0) {
        const lock = LockService.getScriptLock();
        lock.waitLock(5000);
        try {
          const sekarang = Date.now();
          const diblokirSampai = Number(properties.getProperty("ADMIN_BLOCK_UNTIL") || 0);
          if (diblokirSampai > sekarang) {
            const sisaDetik = Math.ceil((diblokirSampai - sekarang) / 1000);
            return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Login admin masih diblokir " + sisaDetik + " detik.", code: "RATE_LIMITED" })).setMimeType(ContentService.MimeType.JSON);
          }

          const jumlahGagal = Number(properties.getProperty("ADMIN_FAILED_COUNT") || 0) + 1;
          if (jumlahGagal >= 3) {
            const tingkatBlokir = Number(properties.getProperty("ADMIN_BLOCK_LEVEL") || 0) + 1;
            const detikBlokir = Math.min(60 * Math.pow(2, tingkatBlokir - 1), 3600);
            properties.setProperties({
              ADMIN_FAILED_COUNT: "0",
              ADMIN_BLOCK_LEVEL: String(tingkatBlokir),
              ADMIN_BLOCK_UNTIL: String(sekarang + detikBlokir * 1000)
            });
            return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Password salah. Login diblokir " + detikBlokir + " detik.", code: "RATE_LIMITED" })).setMimeType(ContentService.MimeType.JSON);
          }
          properties.setProperty("ADMIN_FAILED_COUNT", String(jumlahGagal));
          return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Password salah.", code: "UNAUTHORIZED" })).setMimeType(ContentService.MimeType.JSON);
        } finally {
          lock.releaseLock();
        }
      }

      if (properties.getProperty("ADMIN_FAILED_COUNT")) properties.deleteProperty("ADMIN_FAILED_COUNT");
      if (properties.getProperty("ADMIN_BLOCK_LEVEL")) properties.deleteProperty("ADMIN_BLOCK_LEVEL");
      if (properties.getProperty("ADMIN_BLOCK_UNTIL")) properties.deleteProperty("ADMIN_BLOCK_UNTIL");
      kunciAdminDiterima = true;
    }

    // Kuota harian aksi publik: menahan spam pendaftaran dan menebak kode. Tanpa lock, jadi hitungannya perkiraan.
    // Pendaftaran walk-in yang lolos kunci admin tidak dihitung agar loket tidak ikut kehabisan kuota.
    // shortcut: 500/hari, naikkan kalau warga asli kena "kuota penuh".
    if (action === "checkStatus" || (action === "register" && !kunciAdminDiterima)) {
      const properties = PropertiesService.getScriptProperties();
      const hariIni = Utilities.formatDate(new Date(), ZONA_WAKTU, "yyyy-MM-dd");
      if (properties.getProperty("PUB_HARI") !== hariIni) properties.setProperties({ PUB_HARI: hariIni, PUB_JUMLAH: "0" });
      const jumlahPublik = Number(properties.getProperty("PUB_JUMLAH") || 0) + 1;
      if (jumlahPublik > BATAS_PUBLIK) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Kuota permintaan hari ini sudah penuh. Coba lagi besok.", code: "RATE_LIMITED" })).setMimeType(ContentService.MimeType.JSON);
      properties.setProperty("PUB_JUMLAH", String(jumlahPublik));
    }

    const sheetPendaftaran = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NAMA_SHEET);
    if (!sheetPendaftaran) throw new Error('Sheet "' + NAMA_SHEET + '" tidak ditemukan.');

    if (action === "register") {
      const namaLengkap = String(permintaan.nama || "").trim();
      const nomorWa = String(permintaan.noWa || "").trim().replace(/[\s\-().]/g, "");
      const dusun = String(permintaan.dusun || "").trim();
      const rt = String(permintaan.rt || "").trim();
      const jenisLayanan = String(permintaan.jenisLayanan || "").trim();
      const tanggalDatangTeks = String(permintaan.tanggalDatang || "").trim();
      const jalur = String(permintaan.jalur || "Online").trim();
      const catatan = String(permintaan.catatan || "").trim();

      if ([namaLengkap, nomorWa, rt, catatan].some(function (nilai) { return /^[=+\-@]/.test(nilai); })) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Data mengandung awalan yang tidak aman untuk spreadsheet.", code: "" })).setMimeType(ContentService.MimeType.JSON);
      if (namaLengkap.length < 3 || namaLengkap.length > 100) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Nama lengkap harus 3 sampai 100 karakter.", code: "" })).setMimeType(ContentService.MimeType.JSON);
      if (!DUSUN_VALID.includes(dusun)) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Dusun tidak valid.", code: "" })).setMimeType(ContentService.MimeType.JSON);
      if (!REGEX_RT.test(rt)) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "RT harus 1 sampai 3 digit.", code: "" })).setMimeType(ContentService.MimeType.JSON);
      if (!LAYANAN_VALID.includes(jenisLayanan)) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Jenis layanan tidak valid.", code: "" })).setMimeType(ContentService.MimeType.JSON);
      if (!JALUR_VALID.includes(jalur)) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Jalur pendaftaran tidak valid.", code: "" })).setMimeType(ContentService.MimeType.JSON);
      if (!nomorWa && jalur === "Online") return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Nomor WhatsApp wajib untuk pendaftaran Online.", code: "" })).setMimeType(ContentService.MimeType.JSON);
      if (nomorWa && !REGEX_WA.test(nomorWa)) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Nomor WhatsApp tidak valid.", code: "" })).setMimeType(ContentService.MimeType.JSON);
      if (catatan.length > 500) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Catatan maksimal 500 karakter.", code: "" })).setMimeType(ContentService.MimeType.JSON);

      const cocokTanggal = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggalDatangTeks);
      if (!cocokTanggal) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Tanggal kedatangan tidak valid.", code: "" })).setMimeType(ContentService.MimeType.JSON);
      const tanggalDatang = new Date(Number(cocokTanggal[1]), Number(cocokTanggal[2]) - 1, Number(cocokTanggal[3]));
      if (tanggalDatang.getFullYear() !== Number(cocokTanggal[1]) || tanggalDatang.getMonth() !== Number(cocokTanggal[2]) - 1 || tanggalDatang.getDate() !== Number(cocokTanggal[3])) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Tanggal kedatangan tidak valid.", code: "" })).setMimeType(ContentService.MimeType.JSON);
      if (tanggalDatangTeks < Utilities.formatDate(new Date(), ZONA_WAKTU, "yyyy-MM-dd")) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Tanggal tidak boleh sebelum hari ini.", code: "" })).setMimeType(ContentService.MimeType.JSON);
      if (HARI_TUTUP.includes(tanggalDatang.getDay())) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Balai Desa tidak melayani pada hari itu.", code: "" })).setMimeType(ContentService.MimeType.JSON);

      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        const tanggalKode = Utilities.formatDate(new Date(), ZONA_WAKTU, "ddMMyyyy");
        const jumlahBarisData = sheetPendaftaran.getLastRow() - 1;
        let kodeTracking;
        let ditemukan;
        let percobaan = 0;
        do {
          // base36 dari UUID: 4 karakter = 1,7 juta kombinasi, hex cuma 65 ribu.
          kodeTracking = "JTM-" + tanggalKode + "-" + parseInt(Utilities.getUuid().replace(/-/g, ""), 16).toString(36).toUpperCase().slice(0, 4);
          ditemukan = jumlahBarisData > 0 && sheetPendaftaran.getRange(2, 9, jumlahBarisData).createTextFinder(kodeTracking).matchEntireCell(true).findNext();
          percobaan++;
        } while (ditemukan && percobaan < 10);
        if (ditemukan) throw new Error("Gagal membuat kode tracking unik.");

        const baris = [
          new Date(), namaLengkap, nomorWa, dusun, rt.padStart(3, "0"), jenisLayanan,
          tanggalDatang, jalur, kodeTracking, "Diproses", catatan
        ];
        sheetPendaftaran.getRange(sheetPendaftaran.getLastRow() + 1, 1, 1, HEADERS.length).setValues([baris]);
        // Baris yang baru ditulis ikut dikembalikan, supaya halaman admin tidak
        // perlu mengunduh seluruh sheet hanya untuk menambah satu kartu.
        const data = {
          timestamp: baris[0].toISOString(), nama: baris[1], noWa: baris[2], dusun: baris[3],
          rt: baris[4], jenisLayanan: baris[5], tanggalDatang: tanggalDatangTeks, jalur: baris[7],
          trackingCode: baris[8], statusPelayanan: baris[9], catatan: baris[10]
        };
        return ContentService.createTextOutput(JSON.stringify({ success: true, trackingCode: kodeTracking, data: data })).setMimeType(ContentService.MimeType.JSON);
      } finally {
        lock.releaseLock();
      }
    }

    if (action === "checkStatus" || action === "updateStatus") {
      const kodeTracking = String(permintaan.trackingCode || "").trim().toUpperCase();
      if (!REGEX_KODE.test(kodeTracking)) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Kode Tracking tidak valid.", code: "" })).setMimeType(ContentService.MimeType.JSON);
      const jumlahBarisData = sheetPendaftaran.getLastRow() - 1;
      const cell = jumlahBarisData > 0 ? sheetPendaftaran.getRange(2, 9, jumlahBarisData).createTextFinder(kodeTracking).matchEntireCell(true).findNext() : null;
      if (!cell) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Kode Tracking tidak ditemukan.", code: "" })).setMimeType(ContentService.MimeType.JSON);

      if (action === "checkStatus") {
        const data = sheetPendaftaran.getRange(cell.getRow(), 6, 1, 5).getValues()[0];
        const tanggalDatang = data[1] instanceof Date ? Utilities.formatDate(data[1], ZONA_WAKTU, "yyyy-MM-dd") : String(data[1] || "");
        return ContentService.createTextOutput(JSON.stringify({ success: true, jenisLayanan: data[0], tanggalDatang: tanggalDatang, trackingCode: data[3], statusPelayanan: data[4] })).setMimeType(ContentService.MimeType.JSON);
      }

      const statusBaru = String(permintaan.newStatus || "").trim();
      const catatan = String(permintaan.catatan || "").trim();
      if (!STATUS_VALID.includes(statusBaru)) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Status tidak valid.", code: "" })).setMimeType(ContentService.MimeType.JSON);
      if (/^[=+\-@]/.test(catatan) || catatan.length > 500) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Catatan tidak valid atau terlalu panjang.", code: "" })).setMimeType(ContentService.MimeType.JSON);
      sheetPendaftaran.getRange(cell.getRow(), 10, 1, 2).setValues([[statusBaru, catatan]]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, statusPelayanan: statusBaru, catatan: catatan })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getAllData") {
      const jumlahTotal = Math.max(0, sheetPendaftaran.getLastRow() - 1);
      // shortcut: hanya 5000 baris terbaru yang dikirim; naikkan BATAS_MUTLAK kalau arsip desa melewatinya.
      const batas = Math.min(BATAS_MUTLAK, jumlahTotal);
      const mulai = jumlahTotal - batas;
      const rows = batas ? sheetPendaftaran.getRange(mulai + 2, 1, batas, HEADERS.length).getValues() : [];
      const data = rows.map(function (row) {
        return { timestamp: row[0] instanceof Date ? row[0].toISOString() : "", nama: row[1], noWa: row[2], dusun: row[3], rt: String(row[4]).padStart(3, "0"), jenisLayanan: row[5], tanggalDatang: row[6] instanceof Date ? Utilities.formatDate(row[6], ZONA_WAKTU, "yyyy-MM-dd") : String(row[6] || ""), jalur: row[7], trackingCode: row[8], statusPelayanan: row[9], catatan: row[10] };
      });
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: data })).setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error("Aksi valid tidak memiliki penanganan: " + action);
  } catch (error) {
    console.error(JSON.stringify({
      message: String(error && error.message || error),
      stack: String(error && error.stack || "")
    }));
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Server mengalami kesalahan.", code: "INTERNAL_ERROR" })).setMimeType(ContentService.MimeType.JSON);
  }
}

