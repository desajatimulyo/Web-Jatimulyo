/*
 * Menyimpan elemen yang membuka setiap modal.
 *
 * Ketika modal ditutup, fokus dikembalikan ke elemen tersebut.
 * Map diperlukan karena halaman dapat memiliki beberapa modal.
 */
const modalOpeners = new Map();


/*
 * Mengambil semua elemen yang dapat menerima fokus di dalam modal.
 *
 * Daftar ini digunakan untuk:
 * - memindahkan fokus saat modal dibuka
 * - menjaga tombol Tab tetap berada di dalam modal
 *
 * Elemen disabled dan tabindex="-1" tidak disertakan karena memang
 * tidak dapat atau tidak boleh menerima fokus.
 */
function getFocusableElements(modal) {
    return Array.from(modal.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
}


/*
 * Membuka modal, memindahkan fokus ke dalamnya, dan menjaga fokus
 * agar tidak keluar selama modal masih terbuka.
 *
 * Escape menutup modal.
 * Tab bergerak maju di dalam modal.
 * Shift + Tab bergerak mundur di dalam modal.
 */
function openModal(modalId) {
    const modal = $(modalId);

    /*
     * Jangan membuka modal yang sudah terbuka.
     *
     * Tanpa pemeriksaan ini, listener keyboard dapat terpasang
     * lebih dari sekali pada modal yang sama.
     */
    if (!modal.classList.contains("hidden")) return;

    modalOpeners.set(modalId, document.activeElement);

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.classList.add("overflow-hidden");

    const firstFocusableElement = getFocusableElements(modal)[0];

    if (firstFocusableElement) firstFocusableElement.focus();

    /*
     * Listener disimpan pada modal agar listener yang sama dapat
     * dilepas kembali ketika modal ditutup.
     */
    modal.handleModalKeydown = (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closeModalById(modalId);
            return;
        }

        if (event.key !== "Tab") return;

        /*
         * Daftar diambil ulang karena tombol dapat berubah menjadi
         * disabled atau hidden selama modal terbuka.
         */
        const focusableElements = getFocusableElements(modal);

        if (focusableElements.length === 0) {
            event.preventDefault();
            modal.focus();
            return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
            return;
        }

        if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    };

    modal.addEventListener("keydown", modal.handleModalKeydown);
}


/*
 * Menutup modal dan mengembalikan fokus ke elemen yang membukanya.
 *
 * Scroll halaman hanya dibuka kembali jika tidak ada modal atau
 * peringatan lain yang masih terbuka.
 */
function closeModalById(modalId) {
    const modal = $(modalId);

    if (modal.classList.contains("hidden")) return;

    modal.classList.add("hidden");
    modal.classList.remove("flex");

    if (modal.handleModalKeydown) {
        modal.removeEventListener("keydown", modal.handleModalKeydown);
        delete modal.handleModalKeydown;
    }

    const modalOpener = modalOpeners.get(modalId);
    modalOpeners.delete(modalId);

    const anotherOverlayIsOpen = document.querySelector(
        ".modal-backdrop.flex, .warn-overlay.flex"
    );

    if (!anotherOverlayIsOpen) {
        document.body.classList.remove("overflow-hidden");
    }

    if (modalOpener?.isConnected) modalOpener.focus();
}