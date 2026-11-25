/*
 * Pendaftaran yang sedang dibuka di modal Kelola.
 * Nilai ini dipakai saat operator menyimpan perubahan.
 */
let managedRegistration = null;


/*
 * Membuka modal Kelola dan mengisi seluruh data pendaftaran.
 */
function openManage(registration) {
    managedRegistration = registration;

    $("m-kode").textContent = "Kode Tracking: " + String(registration.trackingCode || "").toUpperCase();
    $("m-nama").textContent = registration.nama || "-";
    $("m-wa").textContent = formatPhoneId(registration.noWa);
    $("m-dusun").textContent = registration.dusun || "-";
    $("m-rt").textContent = registration.rt || "-";
    $("m-jalur").textContent = registration.jalur || "-";
    $("m-layanan").textContent = registration.jenisLayanan || "-";
    $("m-tanggal").textContent = formatTanggalPanjang(registration.tanggalDatang);
    $("m-timestamp").textContent = formatDateTimeId(registration.timestamp);
    $("m-catatan").value = registration.catatan || "";

    /*
     * WhatsApp membutuhkan nomor internasional tanpa tanda plus.
     * Contoh: 081234567890 menjadi 6281234567890.
     */
    const phone = String(registration.noWa || "").replace(/\D/g, "");
    $("m-wa-link").classList.toggle("hidden", !phone);
    $("m-wa-link").href = phone ? "https://wa.me/" + phone.replace(/^0/, "62") : "#";

    /*
     * Susun ulang pilihan status setiap modal dibuka agar pilihan
     * yang aktif selalu mengikuti data pendaftaran.
     */
    $("m-status").textContent = "";

    for (const status of STATUS_OPTIONS) {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = getStatusStyle(status).label;
        option.selected = status === (registration.statusPelayanan || "Diproses");
        $("m-status").appendChild(option);
    }

    /*
     * Tampilkan badge status saat ini.
     */
    const statusStyle = getStatusStyle(registration.statusPelayanan);
    const statusBadge = $("m-current-badge").querySelector(".badge");

    statusBadge.dataset.status = statusStyle.key;
    statusBadge.textContent = statusStyle.label;

    /*
     * Tampilkan berkas berdasarkan jenis layanan dan bersihkan
     * pesan error dari penggunaan modal sebelumnya.
     */
    syncBerkas("m-berkas", registration.jenisLayanan);

    showError("");
    $("m-error").textContent = "";
    $("m-error").classList.add("hidden");

    openModal("modal-manage");
    $("m-close").focus();
}


/*
 * Menutup modal Kelola.
 */
function closeManage() {
    closeModalById("modal-manage");
}


/*
 * Tombol tutup dan Batal menutup modal.
 */
$("m-close").addEventListener("click", closeManage);
$("m-cancel").addEventListener("click", closeManage);


/*
 * Klik pada latar belakang menutup modal.
 * Klik pada isi modal tidak menutupnya.
 */
$("modal-manage").addEventListener("click", (event) => {
    if (event.target === $("modal-manage")) closeManage();
});


/*
 * Tombol catatan cepat menambahkan satu catatan ke textarea.
 * Catatan yang sama tidak ditambahkan dua kali.
 */
$("m-chips").addEventListener("click", (event) => {
    const chip = event.target.closest("button[data-chip]");
    if (!chip) return;

    const notes = $("m-catatan").value
        .split("\n")
        .map((note) => note.trim())
        .filter(Boolean);

    if (!notes.includes(chip.dataset.chip)) notes.push(chip.dataset.chip);

    $("m-catatan").value = notes.join("\n");
    $("m-catatan").focus();
});


/*
 * Menyimpan status dan catatan.
 *
 * Server menjadi sumber hasil akhir. Setelah server berhasil
 * menyimpan, data lokal diperbarui lalu dashboard dirender ulang.
 */
$("m-save").addEventListener("click", async () => {
    if (!managedRegistration) {
        $("m-error").textContent = "Tidak ada pendaftaran yang sedang dikelola.";
        $("m-error").classList.remove("hidden");
        return;
    }

    $("m-error").textContent = "";
    $("m-error").classList.add("hidden");
    setLoading("m-save", "m-spin", "m-save-label", true, "Menyimpan perubahan...");

    try {
        const result = await callApi({
            action: "updateStatus",
            trackingCode: managedRegistration.trackingCode,
            newStatus: $("m-status").value,
            catatan: $("m-catatan").value.trim()
        });

        managedRegistration.statusPelayanan = result.statusPelayanan;
        managedRegistration.catatan = result.catatan;

        /*
         * managedRegistration menunjuk objek yang dibuka dari rows,
         * sehingga perubahan di atas biasanya sudah memperbarui rows.
         *
         * Pencarian ini hanya memastikan data masih ada. Jika data
         * hilang dari rows, tambahkan kembali agar tetap terlihat.
         */
        const registrationStillExists = rows.some(
            (registration) => registration.trackingCode === managedRegistration.trackingCode
        );

        if (!registrationStillExists) rows.push(managedRegistration);

        renderStats();
        applyFilters();
        toast("Perubahan tersimpan.");
        closeManage();
    } catch (error) {
        $("m-error").textContent = error.message || "Perubahan gagal disimpan. Silakan coba lagi.";
        $("m-error").classList.remove("hidden");
    } finally {
        /*
         * Kembalikan tombol ke keadaan normal baik proses berhasil
         * maupun gagal.
         */
        setLoading("m-save", "m-spin", "m-save-label", false, "Menyimpan perubahan...");
    }
});


/*
 * Buat wadah berkas satu kali ketika halaman dimuat.
 * Isinya diperbarui oleh openManage() untuk setiap pendaftaran.
 */
fillBerkasBox("m-berkas");