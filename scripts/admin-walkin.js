/*
 * Menyimpan kalender pendaftaran offline.
 *
 * Nilainya baru tersedia setelah makeCalendar() dijalankan
 * pada bagian paling bawah file.
 */
let calWalkin = null;


/*
 * Aturan validasi setiap field.
 *
 * Setiap pemeriksaan mengembalikan:
 * - teks kosong jika nilai valid
 * - pesan kesalahan jika nilai tidak valid
 */
const WALKIN_CHECKS = {
    "w-nama": (value) =>
        value.trim().length < 3
            ? "Nama lengkap minimal 3 huruf."
            : "",

    "w-wa": (value) =>
        value.trim() && !WA_REGEX.test(normalizePhone(value))
            ? "Nomor WhatsApp tidak valid. Kosongkan jika tidak punya."
            : "",

    "w-dusun": (value) =>
        value
            ? ""
            : "Pilih dusun.",

    "w-rt": (value) =>
        RT_REGEX.test(value.trim())
            ? ""
            : "Isi RT dengan angka, contoh 003.",

    "w-layanan": (value) =>
        value
            ? ""
            : "Pilih jenis layanan.",

    "w-tanggal": (value) =>
        msgTanggalError(value)
};


/*
 * Mengembalikan form ke keadaan awal.
 *
 * form.reset() hanya mereset elemen HTML. Kalender, kotak berkas,
 * dan pesan kesalahan tetap harus dibersihkan sendiri.
 */
function resetWalkinForm() {
    $("form-walkin").reset();

    if (calWalkin) {
        calWalkin.sync();
    }

    $("w-berkas-box").classList.add("hidden");

    $("w-error").textContent = "";
    $("w-error").classList.add("hidden");

    for (const field of Object.keys(WALKIN_CHECKS)) {
        setFieldError(field, "");
    }
}


/*
 * Membuka modal dalam keadaan siap untuk pendaftaran baru.
 */
function openWalkin() {
    resetWalkinForm();

    $("walkin-form-view").classList.remove("hidden");
    $("walkin-success-view").classList.add("hidden");

    openModal("modal-walkin");

    $("w-nama").focus();
}


/*
 * Menutup modal pendaftaran offline.
 */
function closeWalkin() {
    closeModalById("modal-walkin");
}


/*
 * Menampilkan berkas yang harus dibawa berdasarkan layanan
 * yang dipilih operator.
 */
function updateWalkinDocuments() {
    const service = $("w-layanan").value;

    syncBerkas("w-berkas-box", service);
    $("w-berkas-box").classList.toggle("hidden", !service);
}


/*
 * Memeriksa seluruh form.
 *
 * Semua pesan kesalahan diperbarui sekaligus agar operator dapat
 * langsung melihat seluruh field yang perlu diperbaiki.
 *
 * Fungsi mengembalikan field pertama yang salah agar halaman dapat
 * mengarahkan operator ke field tersebut.
 */
function validateWalkinForm() {
    let firstInvalidField = "";

    for (const field of Object.keys(WALKIN_CHECKS)) {
        const message = WALKIN_CHECKS[field]($(field).value);

        setFieldError(field, message);

        if (!firstInvalidField && message) {
            firstInvalidField = field;
        }
    }

    return firstInvalidField;
}


/*
 * Menangani seluruh proses pendaftaran offline.
 *
 * Alurnya sengaja ditulis dalam satu fungsi agar maintainer dapat
 * membacanya dari atas ke bawah tanpa berpindah-pindah fungsi:
 *
 * 1. validasi form
 * 2. susun data
 * 3. kirim ke server
 * 4. tampilkan hasil
 * 5. tambahkan data baru ke dashboard
 */
async function submitWalkin(event) {
    event.preventDefault();

    $("w-error").textContent = "";
    $("w-error").classList.add("hidden");

    const firstInvalidField = validateWalkinForm();

    if (firstInvalidField) {
        const fieldToFocus = firstInvalidField === "w-tanggal"
            ? $("w-tanggal-btn")
            : $(firstInvalidField);

        fieldToFocus.focus();

        fieldToFocus.scrollIntoView({
            block: "center",
            behavior: "smooth"
        });

        return;
    }

    const payload = {
        action: "register",
        nama: $("w-nama").value.trim(),
        noWa: normalizePhone($("w-wa").value),
        dusun: $("w-dusun").value,
        rt: $("w-rt").value.trim(),
        jenisLayanan: $("w-layanan").value,
        tanggalDatang: $("w-tanggal").value,
        jalur: "Offline",
        catatan: $("w-catatan").value.trim()
    };

    setLoading(
        "w-submit",
        "w-spin",
        "w-submit-label",
        true,
        "Menyimpan pendaftaran..."
    );

    try {
        const result = await callApi(payload);

        if (!result.trackingCode || !result.data) {
            throw new Error("Pendaftaran gagal. Silakan coba lagi.");
        }

        $("ws-kode").textContent =
            String(result.trackingCode).toUpperCase();

        $("ws-nama").textContent =
            payload.nama;

        $("ws-layanan").textContent =
            payload.jenisLayanan;

        $("ws-tanggal").textContent =
            formatTanggalPanjang(payload.tanggalDatang);

        $("walkin-form-view").classList.add("hidden");
        $("walkin-success-view").classList.remove("hidden");

        /*
         * Server sudah mengembalikan data pendaftaran yang baru.
         * Data tersebut langsung ditambahkan agar dashboard tidak
         * perlu mengunduh ulang seluruh isi sheet.
         */
        rows.push({
            ...result.data,
            tanggalDatang: normalizeYmd(result.data.tanggalDatang)
        });

        renderStats();

        page = 1;
        applyFilters();
    } catch (error) {
        $("w-error").textContent =
            error.message || "Pendaftaran gagal. Silakan coba lagi.";

        $("w-error").classList.remove("hidden");
    } finally {
        /*
         * Loading harus selalu dihentikan, baik penyimpanan berhasil
         * maupun gagal.
         */
        setLoading(
            "w-submit",
            "w-spin",
            "w-submit-label",
            false,
            "Menyimpan pendaftaran..."
        );
    }
}


/*
 * Membuka dan menutup modal.
 */
$("btn-walkin").addEventListener("click", openWalkin);
$("w-close").addEventListener("click", closeWalkin);
$("w-cancel").addEventListener("click", closeWalkin);
$("ws-done").addEventListener("click", closeWalkin);


/*
 * Membuka kembali form kosong setelah pendaftaran berhasil.
 */
$("ws-another").addEventListener("click", openWalkin);


/*
 * Memperbarui daftar berkas ketika layanan berubah.
 */
$("w-layanan").addEventListener(
    "change",
    updateWalkinDocuments
);


/*
 * Menjalankan proses pendaftaran ketika form dikirim.
 */
$("form-walkin").addEventListener(
    "submit",
    submitWalkin
);


/*
 * Menutup modal hanya jika operator mengklik latar belakang.
 *
 * Klik pada isi modal tidak menutup modal.
 */
$("modal-walkin").addEventListener("click", (event) => {
    if (event.target === $("modal-walkin")) {
        closeWalkin();
    }
});


/*
 * Mengisi data awal yang dibutuhkan form.
 */
fillDusunSelect($("w-dusun"));
fillLayananSelect($("w-layanan"));
fillBerkasBox("w-berkas-box");


/*
 * Membuat kalender setelah elemen form tersedia.
 *
 * Setiap tanggal berubah, tampilan field tanggal ikut diperbarui.
 */
calWalkin = makeCalendar(
    $("w-tanggal-btn"),
    $("w-tanggal"),
    () => syncTanggalField("w-tanggal", calWalkin)
);