/*
 * Data dan keadaan utama dashboard.
 *
 * rows berisi seluruh pendaftaran dari server.
 * view berisi pendaftaran yang sudah difilter dan diurutkan.
 * page menyimpan nomor halaman yang sedang ditampilkan.
 *
 * filterTimer menunda filter pencarian agar tidak dijalankan
 * pada setiap huruf yang sedang diketik.
 */
let rows = [];
let view = [];
let page = 1;
let filterTimer = null;


/*
 * Menampilkan pesan kesalahan pada modal password.
 *
 * Pesan kosong akan membersihkan dan menyembunyikan kotak error.
 */
function showKeyError(message) {
    const errorBox = $("key-error");

    errorBox.textContent = message || "";
    errorBox.classList.toggle("hidden", !message);
}


/*
 * Mengunci dashboard dan menghapus seluruh data yang sedang tampil.
 *
 * Fungsi ini dipakai ketika:
 * - operator menekan tombol Kunci Dashboard
 * - server menolak password yang sedang digunakan
 */
function relock(message) {
    rows = [];
    view = [];
    page = 1;

    $("cards").textContent = "";
    $("key-input").value = "";
    $("key-submit").disabled = true;

    renderStats();
    setConnState("idle", "Belum terhubung");
    showError(message);
    showKeyError(message);
    openModal("modal-key");
}


/*
 * Server mengirim event ini ketika password ditolak.
 *
 * Jika server tidak menyertakan pesan, tampilkan pesan umum.
 */
document.addEventListener("jtm-unauthorized", (event) => {
    const message = event.detail?.message || "Password salah.";

    relock(message);
});


/*
 * Tombol Kunci Dashboard menghapus password dari browser,
 * membersihkan data, lalu membuka kembali modal password.
 */
$("btn-lock").addEventListener("click", () => {
    clearKey();
    relock("");
});


/*
 * Password yang diterima form harus memiliki minimal 32 karakter.
 *
 * Tombol Masuk tetap nonaktif sampai panjang tersebut terpenuhi.
 * Pesan error lama juga dibersihkan saat operator mulai mengetik.
 */
$("key-input").addEventListener("input", () => {
    const passwordLength = $("key-input").value.trim().length;

    $("key-submit").disabled = passwordLength < 32;
    showKeyError("");
});


/*
 * Menyimpan password lalu mengambil data dashboard.
 */
$("form-key").addEventListener("submit", (event) => {
    event.preventDefault();

    const password = $("key-input").value.trim();

    if (password.length < 32) {
        showKeyError("Password minimal 32 karakter.");
        $("key-input").focus();
        return;
    }

    showKeyError("");
    setKey(password);
    closeModalById("modal-key");
    loadRegistrations(true);
});


/*
 * Mengambil seluruh data pendaftaran dari server.
 *
 * showSpinner menentukan apakah status header harus menampilkan
 * "Memuat data..." selama permintaan berlangsung.
 */
async function loadRegistrations(showSpinner) {
    /*
     * Dashboard tidak boleh meminta data sebelum memiliki password.
     */
    if (!getKey()) {
        openModal("modal-key");
        $("key-input").focus();
        return;
    }

    if (showSpinner) {
        setConnState("loading", "Memuat data...");
    }

    showError("");

    try {
        const result = await callApi({ action: "getAllData" });

        /*
         * Gunakan array kosong jika server tidak mengembalikan data
         * dalam bentuk array.
         *
         * Tanggal dinormalisasi agar seluruh filter membandingkan
         * format YYYY-MM-DD yang sama.
         */
        rows = Array.isArray(result.data)
            ? result.data.map((registration) => ({
                ...registration,
                /* Data lama berstatus "Pending" disamakan dengan "Diproses"
                 * agar filter, statistik, dan modal Kelola membacanya sama. */
                statusPelayanan: String(registration.statusPelayanan || "").toLowerCase() === "pending"
                    ? "Diproses"
                    : registration.statusPelayanan,
                tanggalDatang: normalizeYmd(registration.tanggalDatang)
            }))
            : [];

        renderStats();
        applyFilters();
        setConnState("ok", "Online");
    } catch (error) {
        /*
         * Error UNAUTHORIZED sudah ditangani oleh event
         * jtm-unauthorized yang memanggil relock().
         */
        if (error.code === "UNAUTHORIZED") {
            return;
        }

        setConnState("error", "Gagal terhubung");
        showError(error.message || "Data gagal dimuat. Silakan coba lagi.");
    }
}


/*
 * Menjalankan ulang filter ketika salah satu kontrol berubah.
 *
 * Penundaan 150 milidetik mencegah pencarian diproses terlalu
 * sering ketika operator sedang mengetik.
 */
for (const filterId of [
    "f-search",
    "f-status",
    "f-layanan",
    "f-dusun",
    "f-jalur",
    "f-date",
    "f-sort"
]) {
    $(filterId).addEventListener("input", () => {
        page = 1;

        clearTimeout(filterTimer);
        filterTimer = setTimeout(applyFilters, 150);
    });
}


/*
 * Mengembalikan seluruh filter dan pengurutan ke keadaan awal.
 */
function resetFilters() {
    $("f-search").value = "";
    $("f-status").value = "";
    $("f-layanan").value = "";
    $("f-dusun").value = "";
    $("f-jalur").value = "";
    $("f-date").value = "all";
    $("f-sort").value = "newest";

    page = 1;
    applyFilters();
}


/*
 * Kedua tombol ini melakukan reset filter yang sama.
 */
$("f-reset").addEventListener("click", resetFilters);
$("cards-empty-reset").addEventListener("click", resetFilters);


/*
 * Membuka halaman sebelumnya jika halaman tersebut tersedia.
 */
$("pg-prev").addEventListener("click", () => {
    if (page <= 1) {
        return;
    }

    page--;
    renderTable();
});


/*
 * Membuka halaman berikutnya jika masih ada data setelah
 * halaman yang sedang ditampilkan.
 */
$("pg-next").addEventListener("click", () => {
    if (page * PAGE_SIZE >= view.length) {
        return;
    }

    page++;
    renderTable();
});


/*
 * Siapkan seluruh pilihan filter sebelum data ditampilkan.
 */
fillDusunSelect($("f-dusun"));
fillLayananSelect($("f-layanan"));
fillStatusSelect($("f-status"));

$("f-dusun").querySelector("option").textContent = "Semua Dusun";
$("f-layanan").querySelector("option").textContent = "Semua Layanan";


/*
 * Tampilkan keadaan awal lalu coba mengambil data.
 *
 * Jika browser belum menyimpan password, loadRegistrations()
 * akan membuka modal password dan tidak menghubungi server.
 */
renderStats();
loadRegistrations(true);