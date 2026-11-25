/*
 * Pesan validasi tanggal.
 *
 * Semua pesan tanggal disimpan di sini agar mudah ditemukan dan
 * diubah tanpa mencari teks yang sama di seluruh file.
 */
const MSG_TANGGAL_KOSONG = "Pilih tanggal datang ke balai desa.";
const MSG_TANGGAL_LEWAT = "Tanggal datang tidak boleh sebelum hari ini.";
const MSG_TANGGAL_RUSAK = "Tanggal yang dipilih tidak valid.";


/*
 * Mengubah teks YYYY-MM-DD menjadi objek Date.
 *
 * Fungsi mengembalikan null jika format atau tanggal tidak valid.
 * Contoh tanggal tidak valid: 2026-02-31.
 */
function parseYmd(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);

    const isValid =
        date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day;

    return isValid ? date : null;
}


/*
 * Mengubah objek Date menjadi teks YYYY-MM-DD.
 */
function ymdFrom(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/*
 * Mengambil tanggal hari ini berdasarkan zona waktu Jakarta.
 *
 * Zona waktu ditentukan secara eksplisit agar hasil tidak berubah
 * ketika dashboard dibuka dari perangkat dengan zona waktu berbeda.
 */
function todayYmd() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === "year").value;
    const month = parts.find((part) => part.type === "month").value;
    const day = parts.find((part) => part.type === "day").value;

    return `${year}-${month}-${day}`;
}


/*
 * Menyamakan berbagai bentuk tanggal menjadi YYYY-MM-DD.
 *
 * Nilai yang sudah berbentuk YYYY-MM-DD tidak diproses ulang.
 * Nilai yang tidak dapat dibaca sebagai tanggal dikembalikan apa adanya
 * agar masalah data tetap terlihat dan tidak diam-diam dihapus.
 */
function normalizeYmd(value) {
    const text = String(value || "").trim();

    if (!text) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year").value;
    const month = parts.find((part) => part.type === "month").value;
    const day = parts.find((part) => part.type === "day").value;

    return `${year}-${month}-${day}`;
}


/*
 * Menampilkan tanggal lengkap.
 *
 * Contoh:
 * Senin, 23 November 2026
 */
function formatTanggalPanjang(value) {
    const date = parseYmd(normalizeYmd(value));
    if (!date) return value || "-";

    return `${HARI[date.getDay()]}, ${date.getDate()} ${BULAN[date.getMonth()]} ${date.getFullYear()}`;
}


/*
 * Menampilkan tanggal tanpa nama hari.
 *
 * Contoh:
 * 23 November 2026
 */
function formatTanggalDmy(value) {
    const date = parseYmd(normalizeYmd(value));
    if (!date) return value || "-";

    return `${date.getDate()} ${BULAN[date.getMonth()]} ${date.getFullYear()}`;
}


/*
 * Membuat pesan ketika tanggal jatuh pada hari tanpa pelayanan.
 */
function msgTanggalTutup(dayNumber) {
    return `Balai Desa tutup pada hari ${HARI[dayNumber]}. Pilih hari lain.`;
}


/*
 * Memeriksa satu nilai tanggal.
 *
 * Teks kosong berarti tanggal valid.
 * Teks berisi pesan berarti tanggal tidak valid.
 */
function msgTanggalError(value) {
    if (!value) return MSG_TANGGAL_KOSONG;

    const date = parseYmd(value);
    if (!date) return MSG_TANGGAL_RUSAK;
    if (value < todayYmd()) return MSG_TANGGAL_LEWAT;
    if (HARI_TANPA_PELAYANAN.includes(date.getDay())) return msgTanggalTutup(date.getDay());

    return "";
}


/*
 * Membuat elemen kalender.
 *
 * Struktur yang tetap lebih mudah dibaca sebagai HTML daripada dibuat
 * satu per satu menggunakan createElement() dan setAttribute().
 *
 * HTML di bawah bersifat tetap dan tidak berisi data dari pengguna,
 * sehingga aman dimasukkan menggunakan innerHTML.
 */
function buildCalendarEl() {
    const overlay = document.createElement("div");

    overlay.className = "cal-overlay hidden";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Pilih tanggal kedatangan");

    overlay.innerHTML = `
        <div class="cal-backdrop" data-cal="close"></div>

        <div class="cal-panel">
            <div class="mb-2 flex items-center justify-between">
                <button
                    type="button"
                    data-cal="prev"
                    aria-label="Bulan sebelumnya"
                    class="p-2 text-brand-900 transition hover:bg-brand-100"
                >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>

                <p data-cal-title class="text-sm font-bold text-brand-900"></p>

                <button
                    type="button"
                    data-cal="next"
                    aria-label="Bulan berikutnya"
                    class="p-2 text-brand-900 transition hover:bg-brand-100"
                >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
            </div>

            <div class="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
                <span>Sen</span>
                <span>Sel</span>
                <span>Rab</span>
                <span>Kam</span>
                <span>Jum</span>
                <span>Sab</span>
                <span>Min</span>
            </div>

            <div data-cal-grid class="grid grid-cols-7 gap-1"></div>
        </div>
    `;

    /*
     * Kalender selalu menggunakan enam baris berisi tujuh hari.
     * Jumlah tetap 42 memastikan semua bulan memiliki ruang yang sama.
     */
    const calendarGrid = overlay.querySelector("[data-cal-grid]");

    for (let cellNumber = 0; cellNumber < 42; cellNumber++) {
        const dayButton = document.createElement("button");

        dayButton.type = "button";
        dayButton.setAttribute("data-cell", "");
        calendarGrid.appendChild(dayButton);
    }

    document.body.appendChild(overlay);

    return overlay;
}


/*
 * Membuat dan menghubungkan satu kalender dengan:
 *
 * button  = tombol yang membuka kalender
 * valueEl = input tersembunyi yang menyimpan YYYY-MM-DD
 * onPick  = fungsi yang dijalankan setelah tanggal dipilih
 */
function makeCalendar(button, valueEl, onPick) {
    const calendar = buildCalendarEl();
    const calendarCells = calendar.querySelectorAll("[data-cell]");
    const calendarTitle = calendar.querySelector("[data-cal-title]");
    const buttonText = button.querySelector("span");
    const defaultButtonText = buttonText.textContent;
    const today = parseYmd(todayYmd());

    /*
     * Bulan yang sedang terlihat pada kalender.
     * Tanggalnya selalu dibuat menjadi tanggal 1.
     */
    let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);


    /*
     * Menyamakan tulisan tombol dengan tanggal yang tersimpan.
     */
    function sync() {
        buttonText.textContent = valueEl.value
            ? formatTanggalDmy(valueEl.value)
            : defaultButtonText;
    }


    /*
     * Menggambar ulang seluruh 42 kotak kalender.
     *
     * Tanggal lampau serta hari tanpa pelayanan dinonaktifkan.
     */
    function render() {
        const firstDayOfMonth = new Date(
            visibleMonth.getFullYear(),
            visibleMonth.getMonth(),
            1
        );

        /*
         * Kalender dimulai dari Senin.
         *
         * Jika hari pertama bulan bukan Senin, tanggal dari bulan
         * sebelumnya ditampilkan untuk mengisi kotak awal.
         */
        const daysBeforeMonday = (firstDayOfMonth.getDay() + 6) % 7;

        const firstCalendarDate = new Date(
            firstDayOfMonth.getFullYear(),
            firstDayOfMonth.getMonth(),
            1 - daysBeforeMonday
        );

        calendarCells.forEach((cell, index) => {
            const date = new Date(
                firstCalendarDate.getFullYear(),
                firstCalendarDate.getMonth(),
                firstCalendarDate.getDate() + index
            );

            const dateValue = ymdFrom(date);
            const isPast = date < today;
            const isClosed = HARI_TANPA_PELAYANAN.includes(date.getDay());
            const isSelected = dateValue === valueEl.value;
            const isToday = dateValue === todayYmd();

            cell.textContent = date.getDate();
            cell.disabled = isPast || isClosed;

            /*
             * Bersihkan atribut lama karena kotak yang sama digunakan
             * kembali setiap kali bulan berubah.
             */
            cell.removeAttribute("data-ymd");
            cell.removeAttribute("aria-label");
            cell.removeAttribute("aria-current");

            if (cell.disabled) {
                cell.dataset.state = "off";
                return;
            }

            cell.dataset.state = isSelected ? "sel" : "on";
            cell.dataset.ymd = dateValue;
            cell.setAttribute("aria-label", formatTanggalPanjang(dateValue));

            if (isToday) {
                cell.setAttribute("aria-current", "date");
            }
        });

        calendarTitle.textContent =
            `${BULAN[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`;
    }


    /*
     * Memindahkan fokus ke tanggal yang sudah dipilih.
     *
     * Jika belum ada pilihan, fokus dipindahkan ke tanggal pertama
     * yang dapat dipilih.
     */
    function focusAvailableDate() {
        const selectedDate = calendar.querySelector(`[data-ymd="${valueEl.value}"]`);
        const firstAvailableDate = calendar.querySelector("[data-ymd]");
        const dateToFocus = selectedDate || firstAvailableDate;

        if (dateToFocus) dateToFocus.focus();
    }


    /*
     * Membuka kalender pada bulan dari tanggal yang sudah dipilih.
     *
     * Jika belum ada pilihan, kalender membuka bulan saat ini.
     */
    function openCalendar() {
        const selectedDate = parseYmd(valueEl.value) || today;

        visibleMonth = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            1
        );

        render();
        calendar.classList.remove("hidden");
        focusAvailableDate();
    }


    /*
     * Menutup kalender dan mengembalikan fokus ke tombol pembuka.
     */
    function closeCalendar() {
        calendar.classList.add("hidden");
        button.focus();
    }


    /*
     * Tombol yang sama digunakan untuk membuka dan menutup kalender.
     */
    button.addEventListener("click", () => {
        if (calendar.classList.contains("hidden")) {
            openCalendar();
        } else {
            closeCalendar();
        }
    });


    /*
     * Menangani klik pada latar belakang, navigasi bulan,
     * dan tanggal yang dapat dipilih.
     */
    calendar.addEventListener("click", (event) => {
        const calendarAction = event.target.closest("[data-cal]");

        if (calendarAction?.dataset.cal === "close") {
            closeCalendar();
            return;
        }

        if (calendarAction?.dataset.cal === "prev") {
            visibleMonth = new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth() - 1,
                1
            );

            render();
            focusAvailableDate();
            return;
        }

        if (calendarAction?.dataset.cal === "next") {
            visibleMonth = new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth() + 1,
                1
            );

            render();
            focusAvailableDate();
            return;
        }

        const selectedDay = event.target.closest("button[data-ymd]");
        if (!selectedDay) return;

        valueEl.value = selectedDay.dataset.ymd;

        sync();
        closeCalendar();
        onPick();
    });


    /*
     * Escape menutup kalender.
     *
     * Tombol panah memindahkan fokus:
     * kiri dan kanan = satu hari
     * atas dan bawah = satu minggu
     *
     * Hari lampau dan hari tanpa pelayanan dilewati.
     */
    calendar.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeCalendar();
            event.stopPropagation();
            return;
        }

        const movementByKey = {
            ArrowLeft: -1,
            ArrowRight: 1,
            ArrowUp: -7,
            ArrowDown: 7
        };

        const movement = movementByKey[event.key];
        if (movement === undefined) return;

        const activeDateValue = document.activeElement.dataset.ymd;
        const targetDate = parseYmd(activeDateValue) || today;

        event.preventDefault();

        /*
         * Maksimal tujuh percobaan cukup untuk melewati akhir pekan
         * dan menemukan hari pelayanan berikutnya.
         */
        for (let attempt = 0; attempt < 7; attempt++) {
            targetDate.setDate(targetDate.getDate() + movement);

            const isPast = targetDate < today;
            const isClosed = HARI_TANPA_PELAYANAN.includes(targetDate.getDay());

            if (!isPast && !isClosed) break;
        }

        const targetIsPast = targetDate < today;
        const targetIsClosed = HARI_TANPA_PELAYANAN.includes(targetDate.getDay());

        if (targetIsPast || targetIsClosed) return;

        /*
         * Render bulan baru jika navigasi keyboard menyeberang bulan.
         */
        const movedToDifferentMonth =
            targetDate.getMonth() !== visibleMonth.getMonth()
            || targetDate.getFullYear() !== visibleMonth.getFullYear();

        if (movedToDifferentMonth) {
            visibleMonth = new Date(
                targetDate.getFullYear(),
                targetDate.getMonth(),
                1
            );

            render();
        }

        const targetCell = calendar.querySelector(
            `[data-ymd="${ymdFrom(targetDate)}"]`
        );

        if (targetCell) targetCell.focus();
    });


    /*
     * Samakan teks tombol ketika kalender pertama kali dibuat.
     */
    sync();

    return { sync };
}


/*
 * Memeriksa kembali field tanggal setelah kalender mengubah nilainya.
 *
 * Tanggal rusak menampilkan error.
 * Hari tanpa pelayanan dihapus agar tidak ikut terkirim.
 */
function syncTanggalField(fieldId, calendar) {
    const field = $(fieldId);
    const errorMessage = msgTanggalError(field.value);

    if (
        field.value
        && errorMessage
        && errorMessage !== MSG_TANGGAL_KOSONG
    ) {
        const selectedDate = parseYmd(field.value);

        if (
            selectedDate
            && HARI_TANPA_PELAYANAN.includes(selectedDate.getDay())
        ) {
            field.value = "";
        }
    }

    setFieldError(fieldId, errorMessage === MSG_TANGGAL_KOSONG ? "" : errorMessage);
    calendar.sync();
}