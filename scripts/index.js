/*
 * Urutan tab pada halaman.
 *
 * Urutan ini juga digunakan oleh tombol panah keyboard:
 * Daftar → Status → Informasi.
 */
const TABS = ["daftar", "status", "info"];


/*
 * Kode tracking disimpan selama tab browser masih terbuka.
 *
 * Maksimal lima kode disimpan agar daftar riwayat tetap pendek.
 */
const KODE_STORAGE = "jtm_kode_list";
const MAX_SAVED_CODES = 5;


/*
 * Kalender publik disimpan di sini karena perlu disinkronkan
 * kembali setelah form pendaftaran direset.
 */
let calPublic = null;


/*
 * Membaca daftar kode tracking dari sessionStorage.
 *
 * Data rusak, bukan array, atau tidak sesuai format akan dibuang.
 * Jika JSON rusak, isi penyimpanan dihapus agar error tidak berulang.
 */
function readKodeList() {
    try {
        const storedCodes = JSON.parse(
            sessionStorage.getItem(KODE_STORAGE) || "[]"
        );

        if (!Array.isArray(storedCodes)) {
            return [];
        }

        return storedCodes
            .map((trackingCode) => String(trackingCode).trim().toUpperCase())
            .filter((trackingCode) => KODE_REGEX.test(trackingCode))
            .slice(0, MAX_SAVED_CODES);
    } catch {
        sessionStorage.removeItem(KODE_STORAGE);
        return [];
    }
}


/*
 * Menambahkan kode tracking ke awal riwayat.
 *
 * Kode yang sama tidak disimpan dua kali. Kode terbaru selalu berada
 * di posisi pertama dan hanya lima kode terakhir yang dipertahankan.
 */
function addKode(trackingCode) {
    const normalizedCode = String(trackingCode || "").trim().toUpperCase();

    if (!KODE_REGEX.test(normalizedCode)) {
        return;
    }

    const savedCodes = readKodeList().filter(
        (savedCode) => savedCode !== normalizedCode
    );

    savedCodes.unshift(normalizedCode);

    sessionStorage.setItem(
        KODE_STORAGE,
        JSON.stringify(savedCodes.slice(0, MAX_SAVED_CODES))
    );
}


/*
 * Menampilkan satu tab dan menyembunyikan tab lainnya.
 *
 * aria-selected dan tabIndex diperbarui agar navigasi tab tetap
 * dapat digunakan dengan keyboard dan pembaca layar.
 */
function showTab(tabName) {
    for (const tab of TABS) {
        const isActive = tab === tabName;
        const panel = $("panel-" + tab);
        const button = document.querySelector(`.tab-btn[data-tab="${tab}"]`);

        panel.classList.toggle("hidden", !isActive);
        button.setAttribute("aria-selected", String(isActive));
        button.tabIndex = isActive ? 0 : -1;
    }

    /*
     * Status kode tersimpan hanya diperiksa ketika tab Status dibuka.
     * Ini mencegah request ke server ketika daftar tersebut tidak dilihat.
     */
    if (tabName === "status") {
        renderSavedCodes();
    }

    window.scrollTo({ top: 0 });
}


/*
 * Klik tombol tab membuka panel yang sesuai.
 *
 * Tombol panah kanan dan kiri berpindah tab mengikuti urutan TABS.
 */
for (const tabButton of document.querySelectorAll(".tab-btn")) {
    tabButton.addEventListener("click", () => {
        showTab(tabButton.dataset.tab);
    });

    tabButton.addEventListener("keydown", (event) => {
        const currentTabIndex = TABS.indexOf(tabButton.dataset.tab);

        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
            return;
        }

        event.preventDefault();

        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextTabIndex = (currentTabIndex + direction + TABS.length) % TABS.length;
        const nextTab = TABS[nextTabIndex];
        const nextTabButton = document.querySelector(
            `.tab-btn[data-tab="${nextTab}"]`
        );

        showTab(nextTab);
        nextTabButton.focus();
    });
}


/*
 * Elemen dengan data-goto dapat membuka tab tertentu dari mana saja.
 *
 * Jika tombol berada di dalam modal atau peringatan, overlay tersebut
 * ditutup sebelum tab tujuan ditampilkan.
 */
document.addEventListener("click", (event) => {
    const navigationButton = event.target.closest("[data-goto]");

    if (!navigationButton) {
        return;
    }

    const targetTab = navigationButton.dataset.goto;

    if (!TABS.includes(targetTab)) {
        return;
    }

    const openOverlay = document.querySelector(
        ".modal-backdrop.flex, .warn-overlay.flex"
    );

    if (openOverlay) {
        closeModalById(openOverlay.id);
    }

    showTab(targetTab);
});


/*
 * Tampilkan tahun saat ini pada footer.
 */
$("footer-year").textContent = new Date().getFullYear();


/*
 * Isi form dan informasi layanan menggunakan data aplikasi.
 */
fillDusunSelect($("dusun"));
fillLayananSelect($("jenisLayanan"));
fillBerkasBox("checklist-box");
fillInfoAccordion($("accordion"));


/*
 * Hubungkan kalender dengan field Tanggal Datang.
 *
 * Setelah pengguna memilih tanggal, field diperiksa dan teks tombol
 * kalender disinkronkan dengan tanggal yang tersimpan.
 */
calPublic = makeCalendar(
    $("tanggalDatang-btn"),
    $("tanggalDatang"),
    () => syncTanggalField("tanggalDatang", calPublic)
);


/*
 * Halaman selalu dimulai dari tab pendaftaran.
 */
showTab("daftar");