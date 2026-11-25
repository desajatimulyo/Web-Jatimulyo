/*
 * Merapikan nomor telepon sebelum divalidasi atau dikirim.
 *
 * Fungsi hanya menghapus spasi dan tanda pemisah umum.
 * Awalan nomor tidak diubah di sini.
 *
 * Contoh:
 * 0812-3456-7890 menjadi 081234567890
 * +62 (812) 3456 7890 menjadi +6281234567890
 */
function normalizePhone(value) {
    return String(value || "").trim().replace(/[\s\-().]/g, "");
}


/*
 * Mengubah tombol ke keadaan memuat atau kembali ke keadaan normal.
 *
 * Saat memuat:
 * - tombol dinonaktifkan
 * - spinner ditampilkan
 * - ikon biasa disembunyikan
 * - teks tombol diganti
 * - form atau modal diberi aria-busy="true"
 *
 * Teks asli disimpan pada data-idle agar dapat dikembalikan setelah
 * proses selesai.
 */
function setLoading(buttonId, spinnerId, labelId, isLoading, loadingText) {
    const button = $(buttonId);
    const spinner = $(spinnerId);
    const label = $(labelId);
    const formOrDialog = button.closest("form, [role=dialog]");
    const normalIcon = button.querySelector(".action-icon");

    if (isLoading && !label.dataset.idle) {
        label.dataset.idle = label.textContent;
    }

    button.disabled = isLoading;
    button.setAttribute("aria-disabled", String(isLoading));
    button.classList.toggle("is-loading", isLoading);

    spinner.classList.toggle("hidden", !isLoading);

    if (normalIcon) {
        normalIcon.classList.toggle("hidden", isLoading);
    }

    label.textContent = isLoading ? loadingText : label.dataset.idle;
    label.setAttribute("role", "status");
    label.setAttribute("aria-live", "polite");

    if (formOrDialog) {
        formOrDialog.setAttribute("aria-busy", String(isLoading));
    }
}


/*
 * Menampilkan atau menghapus pesan kesalahan pada satu field.
 *
 * fieldId harus cocok dengan:
 * - id milik input
 * - data-for milik elemen pesan error
 *
 * Contoh:
 * input id="w-nama"
 * pesan data-err data-for="w-nama"
 */
function setFieldError(fieldId, message) {
    const input = $(fieldId);
    const errorMessage = document.querySelector(
        `[data-err][data-for="${fieldId}"]`
    );
    const fieldContainer = input.closest(".field");

    errorMessage.textContent = message || "";
    errorMessage.classList.toggle("hidden", !message);
    fieldContainer.classList.toggle("field-invalid", Boolean(message));

    if (message) {
        input.setAttribute("aria-invalid", "true");
    } else {
        input.removeAttribute("aria-invalid");
    }
}


/*
 * Memasang validasi langsung pada satu field.
 *
 * Error pertama kali ditampilkan setelah pengguna selesai mengubah
 * field dan memicu event change. Setelah itu, pesan diperbarui pada
 * setiap input agar segera hilang ketika nilainya sudah benar.
 */
function attachLiveValidation(fieldId, validate) {
    let hasBeenValidated = false;

    $(fieldId).addEventListener("change", () => {
        hasBeenValidated = true;
        setFieldError(fieldId, validate($(fieldId).value));
    });

    $(fieldId).addEventListener("input", () => {
        if (hasBeenValidated) {
            setFieldError(fieldId, validate($(fieldId).value));
        }
    });
}


/*
 * Menampilkan daftar berkas yang cocok dengan layanan terpilih.
 *
 * Semua daftar lain disembunyikan. Jika nama layanan kosong atau
 * tidak ditemukan, seluruh daftar berkas akan tersembunyi.
 */
function syncBerkas(containerId, serviceName) {
    const documentLists = $(containerId).querySelectorAll("[data-berkas]");

    for (const documentList of documentLists) {
        const belongsToSelectedService =
            documentList.dataset.berkas === serviceName;

        documentList.classList.toggle(
            "hidden",
            !belongsToSelectedService
        );
    }
}


/*
 * Mencegah form dikirim lagi ketika proses sebelumnya masih berjalan.
 *
 * setLoading() memberi aria-busy="true" pada form yang sedang
 * diproses. Listener ini menangkap percobaan submit berikutnya
 * sebelum listener submit lain dijalankan.
 */
document.addEventListener("submit", (event) => {
    if (event.target.getAttribute("aria-busy") !== "true") {
        return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
}, true);