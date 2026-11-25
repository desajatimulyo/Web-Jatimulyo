/*
 * Mengambil satu elemen berdasarkan id.
 *
 * Contoh:
 * $("f-dusun") sama dengan document.getElementById("f-dusun").
 */
const $ = (id) => document.getElementById(id);


/*
 * Mengisi pilihan dusun.
 *
 * DUSUN_GROUP adalah data tetap dari file aplikasi, bukan data
 * pengguna atau respons server. Karena itu aman ditulis sebagai HTML.
 */
function fillDusunSelect(select) {
    select.innerHTML = `
        <option value="">-- Pilih Dusun --</option>

        ${DUSUN_GROUP.map((group) => `
            <optgroup label="${group.label}">
                ${group.values.map((dusun) =>
                    `<option value="${dusun}">Dusun ${dusun}</option>`
                ).join("")}
            </optgroup>
        `).join("")}
    `;
}


/*
 * Mengisi pilihan jenis layanan.
 *
 * Nilai option dan teks yang terlihat memakai nama layanan yang sama.
 */
function fillLayananSelect(select) {
    select.innerHTML = `
        <option value="">-- Pilih Jenis Layanan --</option>

        ${LAYANAN.map((layanan) =>
            `<option value="${layanan.nama}">${layanan.nama}</option>`
        ).join("")}
    `;
}


/*
 * Mengisi pilihan status untuk filter dashboard.
 *
 * Nilai option mengikuti STATUS_OPTIONS.
 * Teks yang terlihat mengikuti label dari getStatusStyle().
 */
function fillStatusSelect(select) {
    select.innerHTML = `
        <option value="">Semua</option>

        ${STATUS_OPTIONS.map((status) =>
            `<option value="${status}">${getStatusStyle(status).label}</option>`
        ).join("")}
    `;
}


/*
 * Mengisi kotak berkas untuk seluruh layanan.
 *
 * Setiap kelompok berkas disembunyikan lebih dahulu. Kode lain akan
 * menampilkan kelompok yang cocok dengan layanan yang sedang dipilih.
 *
 * Elemen lama dengan data-berkas dihapus agar fungsi ini aman
 * dipanggil lagi tanpa menggandakan daftar.
 */
function fillBerkasBox(containerId) {
    const container = $(containerId);

    container.querySelectorAll("[data-berkas]").forEach((element) => element.remove());

    container.insertAdjacentHTML("beforeend", LAYANAN.map((layanan) => `
        <div data-berkas="${layanan.nama}" class="hidden">
            <p class="text-sm font-semibold mb-2">${layanan.nama}</p>

            <ul class="check-list">
                ${layanan.berkas.map((berkas) =>
                    `<li>${berkas}</li>`
                ).join("")}
            </ul>

            ${layanan.catatan ? `
                <p class="mt-3 text-xs bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2">
                    Catatan: ${layanan.catatan}
                </p>
            ` : ""}
        </div>
    `).join(""));
}


/*
 * Mengisi accordion informasi layanan.
 *
 * Layanan pertama langsung dibuka. Atribut name membuat browser
 * menutup accordion lain ketika satu layanan dibuka.
 */
function fillInfoAccordion(container) {
    container.innerHTML = LAYANAN.map((layanan, index) => `
        <details
            name="syarat-layanan"
            class="group bg-brand-50 shadow-md ring-1 ring-slate-300 overflow-hidden"
            ${index === 0 ? "open" : ""}
        >
            <summary class="cursor-pointer select-none flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50">
                <div>
                    <p class="font-bold text-brand-900">${layanan.nama}</p>
                    <p class="text-sm text-slate-500 mt-0.5">${layanan.desc}</p>
                </div>

                <svg
                    class="chevron w-5 h-5 shrink-0 text-brand-700 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19 9l-7 7-7-7"
                    ></path>
                </svg>
            </summary>

            <div class="px-5 pb-5 pt-1 border-t border-slate-100">
                <p class="text-sm font-semibold text-slate-700 mt-3 mb-2">
                    Berkas fisik yang wajib dibawa
                </p>

                <ul class="check-list text-slate-700">
                    ${layanan.berkas.map((berkas) =>
                        `<li>${berkas}</li>`
                    ).join("")}
                </ul>

                ${layanan.catatan ? `
                    <p class="mt-3 text-xs bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2">
                        Catatan: ${layanan.catatan}
                    </p>
                ` : ""}
            </div>
        </details>
    `).join("");
}