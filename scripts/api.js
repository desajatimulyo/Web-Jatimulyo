/*
 * Pengaturan komunikasi dengan Google Apps Script.
 *
 * Permintaan dibatalkan jika server tidak merespons dalam 25 detik.
 * Password operator disimpan hanya selama tab browser masih terbuka.
 */
const REQUEST_TIMEOUT_MS = 25_000;
const KEY_STORAGE = "jtm_admin_key";


/*
 * Membaca, menyimpan, dan menghapus password operator.
 *
 * sessionStorage dipakai agar password otomatis hilang ketika
 * tab browser ditutup.
 */
function getKey() {
    return sessionStorage.getItem(KEY_STORAGE);
}

function setKey(adminKey) {
    sessionStorage.setItem(KEY_STORAGE, adminKey);
}

function clearKey() {
    sessionStorage.removeItem(KEY_STORAGE);
}


/*
 * Error dari API memiliki kode tambahan agar pemanggil dapat
 * membedakan password salah, URL belum diatur, dan error lainnya.
 */
class ApiError extends Error {
    constructor(message, code = "") {
        super(message);
        this.name = "ApiError";
        this.code = code;
    }
}


/*
 * Mengirim satu permintaan ke Google Apps Script.
 *
 * Alurnya:
 * 1. pastikan URL sudah dikonfigurasi
 * 2. tambahkan password untuk tindakan admin
 * 3. kirim permintaan dengan batas waktu 25 detik
 * 4. periksa respons HTTP dan JSON
 * 5. tangani penolakan dari server
 * 6. ubah error teknis menjadi pesan yang mudah dipahami
 */
async function callApi(payload) {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.startsWith("GANTI_DENGAN")) {
        throw new ApiError(
            "URL Google Apps Script belum dikonfigurasi.",
            "NO_URL"
        );
    }

    /*
     * Salin payload agar fungsi tidak mengubah objek asli milik
     * kode yang memanggil callApi().
     */
    const request = { ...payload };

    /*
     * Password hanya dikirim untuk tindakan yang memang memerlukan
     * hak operator.
     *
     * Pendaftaran online tidak memerlukan password. Pendaftaran
     * offline memerlukannya karena dilakukan dari dashboard admin.
     */
    const requiresAdminKey =
        request.action === "getAllData"
        || request.action === "updateStatus"
        || (request.action === "register" && request.jalur === "Offline");

    if (requiresAdminKey) {
        request.adminKey = getKey();
    }

    /*
     * AbortController menghentikan fetch jika server melewati
     * batas waktu yang ditentukan.
     */
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        /*
         * text/plain dipakai agar permintaan sederhana ke Google Apps
         * Script tidak memicu pemeriksaan CORS preflight yang tidak perlu.
         *
         * Isi body tetap JSON dan dibaca sebagai JSON oleh backend.
         */
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(request),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new ApiError(
                `Server mengalami kesalahan (${response.status}).`,
                "HTTP_ERROR"
            );
        }

        /*
         * Respons harus berupa JSON. Halaman HTML atau teks biasa
         * dari server dianggap sebagai respons yang rusak.
         */
        let result;

        try {
            result = await response.json();
        } catch {
            throw new ApiError(
                "Respons server tidak valid.",
                "INVALID_RESPONSE"
            );
        }

        /*
         * HTTP dapat berhasil tetapi operasi tetap ditolak oleh
         * backend. Kondisi tersebut ditandai dengan success: false.
         */
        if (result?.success === false) {
            /*
             * UNAUTHORIZED berarti password dalam tab ini sudah tidak
             * diterima. Hapus password dan beri tahu dashboard agar
             * membuka kembali modal password.
             */
            if (result.code === "UNAUTHORIZED") {
                clearKey();

                document.dispatchEvent(new CustomEvent("jtm-unauthorized", {
                    detail: {
                        message: result.message || "Password salah."
                    }
                }));
            }

            throw new ApiError(
                result.message || "Permintaan ditolak.",
                result.code || "REQUEST_REJECTED"
            );
        }

        return result;
    } catch (error) {
        /*
         * ApiError sudah memiliki pesan yang siap ditampilkan.
         */
        if (error instanceof ApiError) {
            throw error;
        }

        /*
         * AbortError muncul ketika batas waktu 25 detik tercapai.
         */
        if (error.name === "AbortError") {
            throw new ApiError(
                "Waktu koneksi habis. Periksa koneksi internet, lalu coba kembali.",
                "TIMEOUT"
            );
        }

        /*
         * fetch biasanya menghasilkan TypeError ketika browser tidak
         * dapat mencapai server karena internet, DNS, CORS, atau URL.
         */
        if (error instanceof TypeError) {
            throw new ApiError(
                "Tidak dapat terhubung ke server. Periksa internet dan coba lagi.",
                "CONNECTION_ERROR"
            );
        }

        /*
         * Error tak dikenal diteruskan karena penyebab aslinya tidak
         * boleh disembunyikan dengan pesan yang tidak akurat.
         */
        throw error;
    } finally {
        /*
         * Timer harus selalu dibersihkan agar tidak tetap berjalan
         * setelah permintaan berhasil maupun gagal.
         */
        clearTimeout(timeout);
    }
}