/*
 * Petunjuk yang ditampilkan kepada warga untuk setiap status.
 *
 * pending tetap didukung untuk data lama dan memiliki arti yang
 * sama dengan diproses.
 */
const STATUS_GUIDE = {
    pending: "Berkas Anda sedang diperiksa petugas. Silakan menunggu, tidak ada yang perlu dilakukan sekarang.",
    diproses: "Berkas Anda sedang diperiksa petugas. Silakan menunggu, tidak ada yang perlu dilakukan sekarang.",
    "siap diambil": "Berkas Anda sudah siap. Datang ke Balai Desa pada tanggal kedatangan Anda, lalu tunjukkan Kode Tracking ini kepada Operator.",
    selesai: "Pelayanan Anda sudah selesai dan berkas sudah diserahkan.",
    unknown: "Status tidak dikenali. Silakan hubungi petugas Balai Desa untuk keterangan lebih lanjut."
};


/*
 * Memperbarui langkah pelayanan berdasarkan status saat ini.
 *
 * activeStep:
 * 0 = sedang diproses
 * 1 = siap diambil
 * 2 = selesai
 * -1 = status tidak dikenali
 */
function renderSteps(activeStep) {
    const steps = $("res-steps").querySelectorAll("li");

    steps.forEach((step, stepNumber) => {
        step.toggleAttribute("data-done", activeStep >= 0 && stepNumber <= activeStep);
    });
}


/*
 * Menampilkan atau menyembunyikan error pemeriksaan status.
 */
function showStatusError(message) {
    const errorBox = $("status-error");

    errorBox.textContent = message || "";
    errorBox.classList.toggle("hidden", !message);
}


/*
 * Memberikan tanda visual ketika format kode tracking sudah benar.
 */
function liveKodeFeedback() {
    const trackingCodeInput = $("trackingCode");
    const trackingCode = trackingCodeInput.value.trim().toUpperCase();

    trackingCodeInput.classList.toggle(
        "field-ok",
        KODE_REGEX.test(trackingCode)
    );
}


/*
 * Memeriksa kode tracking sebelum dikirim ke server.
 *
 * Teks kosong berarti kode valid.
 * Teks berisi pesan berarti kode perlu diperbaiki.
 */
function checkKode(value) {
    const trackingCode = value.trim().toUpperCase();

    if (!trackingCode) {
        return "Masukkan Kode Tracking terlebih dahulu.";
    }

    if (!KODE_REGEX.test(trackingCode)) {
        return "Format Kode Tracking: JTM-DDMMYYYY-XXXX, contoh JTM-16112026-A1B2.";
    }

    return "";
}


/*
 * Validasi langsung mulai aktif setelah pengguna selesai mengubah
 * field untuk pertama kali.
 */
attachLiveValidation("trackingCode", checkKode);


/*
 * Kode tracking hanya boleh berisi huruf, angka, dan tanda hubung.
 *
 * Huruf otomatis diubah menjadi kapital dan panjang input dibatasi
 * agar pengguna tidak dapat memasukkan teks yang tidak diperlukan.
 */
$("trackingCode").addEventListener("input", (event) => {
    event.target.value = event.target.value
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, "")
        .slice(0, 29);

    liveKodeFeedback();
});


/*
 * Menampilkan tombol kode tracking yang pernah disimpan.
 *
 * Setiap tombol menampilkan kode dan status terakhirnya. Ketika
 * diklik, kode tersebut dimasukkan kembali ke field pelacakan.
 */
function renderSavedCodeButtons(container, registrations) {
    container.textContent = "";

    for (const registration of registrations) {
        const statusStyle = getStatusStyle(registration.status);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "kode-item";

        const trackingCode = document.createElement("span");
        trackingCode.className = "kode-item-full";
        trackingCode.textContent = registration.trackingCode;

        const statusBadge = document.createElement("span");
        statusBadge.className = "badge";
        statusBadge.dataset.status = statusStyle.key;
        statusBadge.textContent = statusStyle.label;

        button.append(trackingCode, statusBadge);

        button.addEventListener("click", () => {
            $("trackingCode").value = registration.trackingCode;
            liveKodeFeedback();
            $("trackingCode").focus();
        });

        container.appendChild(button);
    }
}


/*
 * Memeriksa status seluruh kode tracking yang tersimpan di browser.
 *
 * Setiap hasil langsung ditampilkan ketika responsnya diterima.
 * Pengguna tidak perlu menunggu semua pemeriksaan selesai.
 *
 * Kode yang gagal diperiksa tidak ditampilkan karena statusnya belum
 * dapat dipastikan. Kode tersebut tetap tersimpan di browser.
 */
function renderSavedCodes() {
    const savedCodes = readKodeList();

    $("kode-list-box").classList.toggle("hidden", savedCodes.length === 0);
    if (savedCodes.length === 0) return;

    const checkedRegistrations = savedCodes.map(() => null);

    /*
     * Render ulang daftar setiap kali satu status selesai diperiksa.
     *
     * Urutan kode tetap mengikuti urutan dari readKodeList(), meskipun
     * respons server dapat tiba dalam urutan yang berbeda.
     */
    function repaintSavedCodes() {
        const activeRegistrations = [];
        const completedRegistrations = [];

        for (const registration of checkedRegistrations) {
            if (!registration) continue;

            if (getStatusStyle(registration.status).key === "selesai") {
                completedRegistrations.push(registration);
            } else {
                activeRegistrations.push(registration);
            }
        }

        renderSavedCodeButtons($("kode-list-aktif"), activeRegistrations);
        renderSavedCodeButtons($("kode-list-selesai"), completedRegistrations);

        $("kode-aktif-wrap").classList.toggle("hidden", activeRegistrations.length === 0);
        $("kode-selesai-wrap").classList.toggle("hidden", completedRegistrations.length === 0);
    }

    /*
     * Kosongkan tampilan lama sebelum respons baru mulai masuk.
     */
    repaintSavedCodes();

    savedCodes.forEach((trackingCode, codeNumber) => {
        callApi({ action: "checkStatus", trackingCode })
            .then((result) => {
                checkedRegistrations[codeNumber] = {
                    trackingCode,
                    status: result.statusPelayanan
                };

                repaintSavedCodes();
            })
            .catch(() => {
                /*
                 * Kegagalan satu kode tidak boleh menghentikan
                 * pemeriksaan kode-kode lainnya.
                 */
            });
    });
}


/*
 * Memeriksa satu kode tracking yang dikirim melalui form.
 *
 * Alurnya:
 * 1. validasi kode
 * 2. kirim kode ke server
 * 3. simpan kode pada riwayat lokal
 * 4. tampilkan hasil dan petunjuk kepada warga
 */
$("form-status").addEventListener("submit", async (event) => {
    event.preventDefault();

    showStatusError("");
    $("status-result").classList.add("hidden");

    const trackingCode = $("trackingCode").value.trim().toUpperCase();
    const validationMessage = checkKode(trackingCode);

    if (validationMessage) {
        setFieldError("trackingCode", validationMessage);
        $("trackingCode").focus();
        return;
    }

    setFieldError("trackingCode", "");
    setLoading("btn-status", "spin-status", "label-status", true, "Memeriksa status...");

    try {
        const result = await callApi({
            action: "checkStatus",
            trackingCode
        });

        const returnedTrackingCode = String(
            result.trackingCode || trackingCode
        ).toUpperCase();

        addKode(returnedTrackingCode);

        /*
         * Seluruh tampilan status mengikuti nilai yang dikembalikan
         * server, bukan nilai yang diperkirakan oleh browser.
         */
        const statusStyle = getStatusStyle(result.statusPelayanan);

        $("res-kode").textContent = returnedTrackingCode;
        $("res-layanan").textContent = result.jenisLayanan || "-";
        $("res-tanggal").textContent = formatTanggalPanjang(result.tanggalDatang);

        $("res-badge").dataset.status = statusStyle.key;
        $("res-badge").textContent = statusStyle.label;

        renderSteps(statusStyle.step);

        $("res-guide").textContent =
            STATUS_GUIDE[statusStyle.key] || STATUS_GUIDE.unknown;

        $("status-result").classList.remove("hidden");
        $("status-result").scrollIntoView({
            block: "nearest",
            behavior: "smooth"
        });
    } catch (error) {
        showStatusError(
            error.message || "Status gagal diperiksa. Silakan coba lagi."
        );
    } finally {
        /*
         * Tombol harus selalu kembali normal, baik pemeriksaan
         * berhasil maupun gagal.
         */
        setLoading("btn-status", "spin-status", "label-status", false, "Memeriksa status...");
    }
});