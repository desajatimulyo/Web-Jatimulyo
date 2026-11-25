/*
 * Aturan validasi form pendaftaran.
 *
 * Setiap pemeriksaan mengembalikan:
 * - teks kosong jika nilai benar
 * - pesan kesalahan jika nilai salah
 */
const FORM_CHECKS = {
    nama: (value) => value.trim().length < 3 ? "Isi nama lengkap minimal 3 huruf." : "",
    noWa: (value) => WA_REGEX.test(normalizePhone(value)) ? "" : "Isi nomor WhatsApp, contoh 081234567890.",
    dusun: (value) => value ? "" : "Isi dusun.",
    rt: (value) => RT_REGEX.test(value.trim()) ? "" : "Isi RT dengan angka, contoh 003.",
    jenisLayanan: (value) => value ? "" : "Pilih jenis layanan.",
    tanggalDatang: (value) => msgTanggalError(value)
};


/*
 * Nama field yang ditampilkan pada ringkasan error.
 *
 * ID teknis seperti jenisLayanan tidak ditampilkan kepada pengguna.
 */
const FIELD_LABELS = {
    nama: "Nama Lengkap",
    noWa: "Nomor WhatsApp",
    dusun: "Dusun",
    rt: "RT",
    jenisLayanan: "Jenis Layanan",
    tanggalDatang: "Tanggal Datang ke Balai Desa"
};


/*
 * Menyimpan hasil pendaftaran terakhir.
 *
 * Data ini digunakan oleh modal sukses dan tombol
 * "Cek Status Pendaftaran".
 */
let lastRegistration = null;


/*
 * Menampilkan checklist berkas sesuai layanan yang dipilih.
 *
 * Jika belum ada layanan yang dipilih, seluruh kotak checklist
 * disembunyikan.
 */
function renderChecklist() {
    const selectedService = $("jenisLayanan").value;

    $("checklist-box").classList.toggle("hidden", !selectedService);
    syncBerkas("checklist-box", selectedService);
}


/*
 * Menampilkan tanda visual ketika nomor WhatsApp sudah valid.
 */
function showWhatsAppValidity() {
    const phoneInput = $("noWa");
    const phoneNumber = normalizePhone(phoneInput.value);

    phoneInput.classList.toggle("field-ok", WA_REGEX.test(phoneNumber));
}


/*
 * Nomor WhatsApp selalu diarahkan ke bentuk lokal 08xxxxxxxxxx.
 *
 * Pengguna tetap dapat mengetik:
 * - 081234567890
 * - 81234567890
 * - 6281234567890
 *
 * Awalan tersebut dibuang lalu diganti dengan 08.
 */
$("noWa").addEventListener("input", (event) => {
    const digits = event.target.value.replace(/\D/g, "");
    const numberWithoutPrefix = digits.replace(/^(628|08|8|0)/, "").slice(0, 11);

    event.target.value = "08" + numberWithoutPrefix;
    showWhatsAppValidity();
});


/*
 * Pasang validasi langsung pada semua field biasa.
 *
 * Tanggal tidak dipasang di sini karena nilainya diubah melalui
 * kalender dan diperiksa oleh syncTanggalField().
 */
for (const fieldId of Object.keys(FORM_CHECKS)) {
    if (fieldId !== "tanggalDatang") {
        attachLiveValidation(fieldId, FORM_CHECKS[fieldId]);
    }
}


/*
 * Memeriksa seluruh form dan menampilkan error pada setiap field.
 *
 * Hasilnya berupa daftar error yang kemudian ditampilkan dalam
 * popup ringkasan.
 */
function collectFormErrors() {
    const errors = [];

    for (const fieldId of Object.keys(FORM_CHECKS)) {
        const message = FORM_CHECKS[fieldId]($(fieldId).value);

        setFieldError(fieldId, message);

        if (message) {
            errors.push({ fieldId, message });
        }
    }

    return errors;
}


/*
 * Menampilkan seluruh error form dalam satu popup.
 *
 * Popup membantu pengguna semua isian yang salah
 * tanpa harus mencari satu per satu di halaman.
 */
function showFormErrors(errors) {
    const errorList = $("err-list");

    errorList.textContent = "";

    for (const error of errors) {
        const listItem = document.createElement("li");
        const fieldLabel = FIELD_LABELS[error.fieldId];

        listItem.textContent = fieldLabel
            ? `${fieldLabel}. ${error.message}`
            : error.message;

        errorList.appendChild(listItem);
    }

    $("err-title").textContent = errors.length > 1
        ? `Ada ${errors.length} isian yang perlu diperbaiki`
        : "Isian belum lengkap";

    $("err-close").classList.remove("hidden");
    openModal("err-popup");
}


/*
 * Setelah popup error ditutup, arahkan pengguna ke field pertama
 * yang perlu diperbaiki.
 *
 * Field tanggal memakai tombol kalender karena input tanggal
 * sebenarnya disimpan pada input tersembunyi.
 */
function focusFirstFormError() {
    const firstError = $("form-daftar").querySelector("[data-err]:not(.hidden)");
    if (!firstError) return;

    const fieldId = firstError.dataset.for;
    const fieldToFocus = fieldId === "tanggalDatang"
        ? $("tanggalDatang-btn")
        : $(fieldId);

    fieldToFocus.focus();
    fieldToFocus.scrollIntoView({ block: "center", behavior: "smooth" });
}


/*
 * Tutup popup error lalu arahkan pengguna ke field pertama
 * yang perlu diperbaiki.
 */
$("err-close").addEventListener("click", () => {
    closeModalById("err-popup");
    focusFirstFormError();
});


/*
 * Mengirim pendaftaran ke server.
 *
 * Alurnya:
 * 1. periksa seluruh isian
 * 2. tampilkan popup jika ada kesalahan
 * 3. kirim data jika seluruh isian benar
 * 4. tampilkan kode tracking
 * 5. kosongkan form setelah berhasil
 */
$("form-daftar").addEventListener("submit", async (event) => {
    event.preventDefault();

    const errors = collectFormErrors();

    if (errors.length) {
        showFormErrors(errors);
        return;
    }

    const registration = {
        action: "register",
        nama: $("nama").value.trim(),
        noWa: normalizePhone($("noWa").value),
        dusun: $("dusun").value,
        rt: $("rt").value.trim(),
        jenisLayanan: $("jenisLayanan").value,
        tanggalDatang: $("tanggalDatang").value
    };

    setLoading("btn-submit", "spin-submit", "label-submit", true, "Mengirim pendaftaran...");

    try {
        const result = await callApi(registration);

        if (!result.trackingCode) {
            throw new Error("Pendaftaran gagal. Silakan coba lagi.");
        }

        lastRegistration = {
            kode: String(result.trackingCode).toUpperCase(),
            layanan: registration.jenisLayanan,
            tanggal: registration.tanggalDatang
        };

        /*
         * Simpan kode pada riwayat lokal sebelum form dikosongkan.
         */
        addKode(lastRegistration.kode);

        /*
         * Isi dan buka modal pendaftaran berhasil.
         */
        $("modal-kode").textContent = lastRegistration.kode;
        $("modal-layanan").textContent = lastRegistration.layanan;
        $("modal-tanggal").textContent = formatTanggalPanjang(lastRegistration.tanggal);

        openModal("modal");

        /*
         * Bersihkan form agar siap menerima pendaftaran baru.
         */
        $("form-daftar").reset();
        calPublic.sync();

        $("noWa").classList.remove("field-ok");
        $("checklist-box").classList.add("hidden");

        for (const fieldId of Object.keys(FORM_CHECKS)) {
            setFieldError(fieldId, "");
        }
    } catch (error) {
        showFormErrors([{
            fieldId: "",
            message: error.message || "Pendaftaran gagal. Silakan coba lagi."
        }]);
    } finally {
        /*
         * Tombol harus selalu kembali normal, baik permintaan
         * berhasil maupun gagal.
         */
        setLoading("btn-submit", "spin-submit", "label-submit", false, "Mengirim pendaftaran...");
    }
});


/*
 * Checklist berkas mengikuti layanan yang dipilih.
 */
$("jenisLayanan").addEventListener("change", renderChecklist);


/*
 * Menutup modal pendaftaran berhasil.
 */
function closeSuccessModal() {
    closeModalById("modal");
}

$("btn-modal-tutup").addEventListener("click", closeSuccessModal);


/*
 * Klik pada latar belakang menutup modal.
 * Klik pada isi modal tidak menutupnya.
 */
$("modal").addEventListener("click", (event) => {
    if (event.target === $("modal")) {
        closeSuccessModal();
    }
});


/*
 * Membuka tab pelacakan dan langsung mengisi kode dari
 * pendaftaran terakhir.
 */
$("btn-modal-cek").addEventListener("click", () => {
    closeSuccessModal();
    showTab("status");

    $("trackingCode").value = lastRegistration?.kode || "";

    liveKodeFeedback();
    $("trackingCode").focus();
});


/*
 * Menyalin kode tracking.
 *
 * Clipboard API digunakan terlebih dahulu. Cara lama dengan textarea
 * hanya digunakan jika Clipboard API tidak tersedia atau ditolak.
 */
$("btn-copy").addEventListener("click", async () => {
    const trackingCode = $("modal-kode").textContent;
    const copyLabel = $("copy-label");

    try {
        await navigator.clipboard.writeText(trackingCode);
    } catch {
        const temporaryTextarea = document.createElement("textarea");

        temporaryTextarea.value = trackingCode;
        temporaryTextarea.style.position = "fixed";
        temporaryTextarea.style.opacity = "0";

        document.body.appendChild(temporaryTextarea);
        temporaryTextarea.select();
        document.execCommand("copy");
        temporaryTextarea.remove();
    }

    /*
     * Simpan teks asli sekali saja, lalu tampilkan konfirmasi
     * selama dua detik.
     */
    if (!copyLabel.dataset.idle) {
        copyLabel.dataset.idle = copyLabel.textContent;
    }

    copyLabel.textContent = "Tersalin!";

    setTimeout(() => {
        copyLabel.textContent = copyLabel.dataset.idle;
    }, 2000);
});
