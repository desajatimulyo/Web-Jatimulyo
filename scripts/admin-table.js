/*
 * Pengaturan daftar.
 *
 * PAGE_SIZE menentukan jumlah kartu yang ditampilkan dalam satu halaman.
 * SORTS berisi seluruh pilihan pengurutan yang tersedia pada filter.
 */
const PAGE_SIZE = 10;

const SORTS = {
    newest: (a, b) =>
        String(b.timestamp).localeCompare(String(a.timestamp)),

    "date-asc": (a, b) =>
        String(a.tanggalDatang).localeCompare(String(b.tanggalDatang))
        || String(a.nama).localeCompare(String(b.nama), "id-ID"),

    "date-desc": (a, b) =>
        String(b.tanggalDatang).localeCompare(String(a.tanggalDatang))
        || String(a.nama).localeCompare(String(b.nama), "id-ID")
};


/*
 * toastTimer menyimpan timer agar toast sebelumnya dapat dibatalkan.
 *
 * view dan page dimiliki scripts/admin.js sebagai keadaan utama dashboard.
 */
let toastTimer = null;


/*
 * Mengubah nilai apa pun menjadi teks kecil yang sudah dirapikan.
 *
 * Fungsi ini digunakan ketika perbandingan tidak boleh terpengaruh
 * huruf besar, huruf kecil, spasi, null, atau undefined.
 */
function lower(value) {
    return String(value || "").trim().toLowerCase();
}


/*
 * Mengubah nomor Indonesia ke bentuk lokal yang diawali angka 0.
 *
 * Contoh:
 * 6281234567890 menjadi 081234567890
 * 81234567890 menjadi 081234567890
 *
 * Semua karakter selain angka dibuang.
 */
function formatPhoneId(value) {
    const digits = String(value || "").replace(/\D/g, "");

    if (!digits) return "-";
    if (digits.startsWith("62")) return "0" + digits.slice(2);
    if (digits.startsWith("8")) return "0" + digits;

    return digits;
}


/*
 * Menampilkan tanggal dan waktu menggunakan format Indonesia.
 *
 * Zona waktu dipaksa ke Asia/Jakarta agar hasil tidak berubah
 * mengikuti pengaturan zona waktu perangkat operator.
 */
function formatDateTimeId(value) {
    if (!value) return "-";

    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Asia/Jakarta"
    }).format(new Date(value));
}


/*
 * Menampilkan atau menyembunyikan pesan kesalahan utama.
 *
 * Pesan kosong berarti banner harus disembunyikan.
 */
function showError(message) {
    const banner = $("error-banner");

    banner.textContent = message || "";
    banner.classList.toggle("hidden", !message);
}


/*
 * Menampilkan pemberitahuan singkat selama 2,2 detik.
 *
 * Timer sebelumnya dibatalkan agar toast terbaru selalu mendapat
 * waktu tampil penuh.
 */
function toast(message) {
    const toastElement = $("toast");

    clearTimeout(toastTimer);

    toastElement.textContent = message;
    toastElement.classList.remove("hidden");
    toastElement.classList.add("reveal");

    toastTimer = setTimeout(() => {
        toastElement.classList.add("hidden");
        toastElement.classList.remove("reveal");
    }, 2200);
}


/*
 * Memperbarui status koneksi pada header.
 *
 * Waktu koneksi hanya ditampilkan ketika state bernilai "ok".
 */
function setConnState(state, text) {
    $("conn").dataset.state = state;
    $("conn-state").textContent = text;

    if (state !== "ok") {
        $("conn-time").textContent = "";
        return;
    }

    const time = new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(new Date());

    $("conn-time").textContent = time.replace(".", ":") + " WIB";
}


/*
 * Menghitung statistik langsung dari seluruh data pendaftaran.
 *
 * "Datang Hari Ini" tidak menghitung pelayanan yang sudah selesai.
 */
function renderStats() {
    const today = todayYmd();

    const arrivingToday = rows.filter((row) =>
        row.tanggalDatang === today
        && lower(row.statusPelayanan) !== "selesai"
    ).length;

    const processing = rows.filter((row) =>
        lower(row.statusPelayanan) === "diproses"
    ).length;

    const readyForPickup = rows.filter((row) =>
        lower(row.statusPelayanan) === "siap diambil"
    ).length;

    $("stat-today").textContent = arrivingToday;
    $("stat-total").textContent = rows.length;
    $("stat-proses").textContent = processing;
    $("stat-siap-diambil").textContent = readyForPickup;
}


/*
 * Membaca seluruh nilai filter dari halaman.
 *
 * Tanggal hari ini, besok, dan akhir pekan dihitung satu kali.
 * Hasilnya kemudian digunakan untuk memeriksa seluruh pendaftaran.
 */
function getFilters() {
    const today = todayYmd();

    const tomorrowDate = parseYmd(today);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    const weekEndDate = parseYmd(today);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const search = lower($("f-search").value);

    return {
        search,
        phoneSearch: search.replace(/\D/g, "").replace(/^62/, "0"),
        status: lower($("f-status").value),
        layanan: $("f-layanan").value,
        dusun: $("f-dusun").value,
        jalur: lower($("f-jalur").value),
        dateMode: $("f-date").value,
        sortKey: $("f-sort").value,
        today,
        tomorrow: ymdFrom(tomorrowDate),
        weekEnd: ymdFrom(weekEndDate)
    };
}


/*
 * Memeriksa apakah tanggal pendaftaran cocok dengan filter tanggal.
 */
function matchesDate(row, filters) {
    if (filters.dateMode === "all") {
        return true;
    }

    if (filters.dateMode === "today") {
        return row.tanggalDatang === filters.today;
    }

    if (filters.dateMode === "besok") {
        return row.tanggalDatang === filters.tomorrow;
    }

    if (filters.dateMode === "pekan") {
        return (
            row.tanggalDatang >= filters.today
            && row.tanggalDatang <= filters.weekEnd
        );
    }

    if (filters.dateMode === "lewat") {
        return (
            row.tanggalDatang < filters.today
            && lower(row.statusPelayanan) !== "selesai"
        );
    }

    return true;
}


/*
 * Memeriksa pencarian teks dan nomor WhatsApp.
 *
 * Pencarian teks mencakup nama, kode tracking, layanan, dusun,
 * RT, dan catatan operator.
 */
function matchesSearch(row, filters) {
    if (!filters.search) {
        return true;
    }

    const searchableText = [
        row.nama,
        row.trackingCode,
        row.jenisLayanan,
        row.dusun,
        row.rt,
        row.catatan
    ].join(" ").toLowerCase();

    if (searchableText.includes(filters.search)) {
        return true;
    }

    if (!filters.phoneSearch) {
        return false;
    }

    const phone = formatPhoneId(row.noWa).replace(/\D/g, "");

    return phone.includes(filters.phoneSearch);
}


/*
 * Memeriksa satu pendaftaran terhadap seluruh filter aktif.
 *
 * Pemeriksaan sederhana dilakukan lebih dahulu agar fungsi segera
 * berhenti ketika data sudah pasti tidak cocok.
 */
function matches(row, filters) {
    if (
        filters.status
        && lower(row.statusPelayanan) !== filters.status
    ) {
        return false;
    }

    if (
        filters.layanan
        && String(row.jenisLayanan || "") !== filters.layanan
    ) {
        return false;
    }

    if (
        filters.dusun
        && String(row.dusun || "") !== filters.dusun
    ) {
        return false;
    }

    if (
        filters.jalur
        && lower(row.jalur) !== filters.jalur
    ) {
        return false;
    }

    if (!matchesDate(row, filters)) {
        return false;
    }

    return matchesSearch(row, filters);
}


/*
 * Menerapkan filter dan pengurutan ke seluruh data.
 *
 * Halaman aktif juga dibatasi agar tidak melampaui halaman terakhir
 * setelah jumlah hasil berubah.
 */
function applyFilters() {
    const filters = getFilters();
    const sort = SORTS[filters.sortKey] || SORTS.newest;

    view = rows.filter((row) => matches(row, filters));
    view.sort(sort);

    const lastPage = Math.max(1, Math.ceil(view.length / PAGE_SIZE));

    page = Math.min(page, lastPage);

    renderTable();
}


/*
 * Mengisi satu kartu menggunakan satu data pendaftaran.
 */
function createCard(row) {
    const card = $("card-tpl")
        .content
        .firstElementChild
        .cloneNode(true);

    card.querySelector('[data-f="nama"]').textContent =
        row.nama || "-";

    card.querySelector('[data-f="layanan"]').textContent =
        row.jenisLayanan || "-";

    card.querySelector('[data-f="tanggal"]').textContent =
        formatTanggalDmy(row.tanggalDatang);

    card.querySelector('[data-f="kode"]').textContent =
        String(row.trackingCode || "").toUpperCase();

    card.querySelector('[data-f="wa"]').textContent =
        formatPhoneId(row.noWa);

    card.querySelector('[data-f="timestamp"]').textContent =
        "Didaftarkan " + formatDateTimeId(row.timestamp);

    const jalurBadge = card.querySelector('[data-f="jalur"]');

    jalurBadge.dataset.jalur = lower(row.jalur);
    jalurBadge.textContent = row.jalur || "-";

    const statusStyle = getStatusStyle(row.statusPelayanan);
    const statusBadge = card.querySelector('[data-f="status"]');

    statusBadge.dataset.status = statusStyle.key;
    statusBadge.textContent = statusStyle.label;

    const note = card.querySelector('[data-f="catatan"]');

    note.textContent = row.catatan || "";
    note.classList.toggle("hidden", !row.catatan);

    const manageButton = card.querySelector('[data-f="manage"]');

    manageButton.addEventListener("click", () => openManage(row));

    return card;
}


/*
 * Menghitung jumlah filter yang sedang aktif.
 *
 * Urutan terbaru tidak dihitung sebagai filter karena merupakan
 * kondisi awal halaman.
 */
function countActiveFilters() {
    return [
        $("f-search").value.trim(),
        $("f-status").value,
        $("f-layanan").value,
        $("f-dusun").value,
        $("f-jalur").value,
        $("f-date").value === "all"
            ? ""
            : $("f-date").value
    ].filter(Boolean).length;
}


/*
 * Memperbarui pesan ketika daftar kosong.
 */
function renderEmptyState(isEmpty, hasNoData) {
    $("cards-empty").classList.toggle("hidden", !isEmpty);

    $("cards-empty-text").textContent = hasNoData
        ? "Belum ada pendaftaran."
        : "Tidak ada data yang cocok dengan filter.";

    $("cards-empty-reset").classList.toggle("hidden", hasNoData);
}


/*
 * Memperbarui informasi jumlah hasil dan tombol reset.
 */
function renderFilterInfo(hasNoData) {
    $("filter-info").textContent = hasNoData
        ? "Tidak ada data."
        : `Menampilkan ${view.length} dari ${rows.length} pendaftar.`;

    $("f-reset").disabled =
        countActiveFilters() === 0
        && $("f-sort").value === "newest";
}


/*
 * Memperbarui informasi dan tombol pagination.
 */
function renderPagination(start, end, isEmpty) {
    $("pager-info").textContent = isEmpty
        ? ""
        : `Kartu ${start + 1}-${end} dari ${view.length}`;

    $("pg-prev").disabled = page === 1;
    $("pg-next").disabled = page * PAGE_SIZE >= view.length;
}


/*
 * Menampilkan kartu pada halaman yang sedang aktif.
 *
 * Fungsi ini juga memperbarui tampilan kosong, informasi filter,
 * dan tombol pagination setelah kartu selesai dibuat.
 */
function renderTable() {
    const cards = $("cards");
    const start = (page - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, view.length);
    const pageRows = view.slice(start, end);

    cards.textContent = "";

    for (const row of pageRows) {
        cards.appendChild(createCard(row));
    }

    const isEmpty = view.length === 0;
    const hasNoData = rows.length === 0;

    renderEmptyState(isEmpty, hasNoData);
    renderFilterInfo(hasNoData);
    renderPagination(start, end, isEmpty);
}