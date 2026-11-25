/*
 * Aturan tanggal pelayanan.
 *
 * Angka hari mengikuti JavaScript:
 * 0 = Minggu
 * 6 = Sabtu
 *
 * Artinya pelayanan tidak tersedia pada Sabtu dan Minggu.
 */
const HARI_TANPA_PELAYANAN = [0, 6];


/*
 * Aturan format input.
 *
 * WA_REGEX menerima nomor Indonesia seperti:
 * 081234567890
 * 6281234567890
 * +6281234567890
 *
 * RT_REGEX menerima 1 sampai 3 angka.
 *
 * KODE_REGEX menerima kode seperti:
 * JTM-20261123-A1B2
 */
const WA_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;
const RT_REGEX = /^\d{1,3}$/;
const KODE_REGEX = /^JTM-[0-9]{8}-[A-Z0-9]{4}$/;


/*
 * Nama bulan dan hari dalam Bahasa Indonesia.
 *
 * Urutannya harus tetap mengikuti nomor bulan dan hari JavaScript.
 * Jangan mengurutkannya secara alfabetis.
 */
const BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const HARI = [
    "Minggu", "Senin", "Selasa", "Rabu",
    "Kamis", "Jumat", "Sabtu"
];


/*
 * Pilihan dusun pada form.
 *
 * label menjadi nama kelompok pilihan.
 * values menjadi pilihan dusun di dalam kelompok tersebut.
 *
 * Contoh:
 * Kelompok I berisi I A, I B, I C, dan I D.
 */
const DUSUN_GROUP = [
    { label: "I", values: ["I A", "I B", "I C", "I D"] },
    { label: "II", values: ["II A", "II B", "II C", "II D"] },
    { label: "III", values: ["III"] },
    { label: "IV", values: ["IV"] },
    { label: "V", values: ["V A", "V B"] }
];


/*
 * Seluruh layanan yang tersedia.
 *
 * Setiap layanan memiliki:
 * nama    = nama yang tampil dan dikirim ke server
 * desc    = penjelasan singkat untuk warga
 * berkas  = dokumen yang wajib dibawa
 * catatan = informasi tambahan jika diperlukan
 *
 * Nama properti jangan diubah tanpa memperbarui seluruh kode
 * yang membaca LAYANAN.
 */
const LAYANAN = [
    {
        nama: "Surat Keterangan Usaha (SKU)",
        desc: "Keterangan bahwa warga memiliki usaha di desa, untuk pengajuan pinjaman, perizinan, atau keperluan lain.",
        berkas: [
            "Fotokopi KTP pemilik usaha",
            "Fotokopi Kartu Keluarga",
            "Surat Pengantar dari RT atau Dusun setempat",
            "Keterangan usaha yang mencantumkan nama, jenis, dan alamat usaha",
            "Foto tempat usaha",
            "Pas foto 3x4"
        ]
    },
    {
        nama: "Surat Keterangan Tidak Mampu (SKTM)",
        desc: "Untuk bantuan pendidikan, kesehatan, atau sosial.",
        berkas: [
            "Fotokopi KTP pemohon",
            "Fotokopi Kartu Keluarga",
            "Surat Pengantar dari RT atau Dusun setempat",
            "Keterangan tujuan penggunaan surat",
            "Dokumen pendukung sesuai tujuan (jika ada), misalnya surat dari sekolah atau fasilitas kesehatan"
        ]
    },
    {
        nama: "Surat Keterangan Domisili",
        desc: "Keterangan bahwa warga bertempat tinggal di Desa Jatimulyo.",
        berkas: [
            "Fotokopi KTP pemohon",
            "Fotokopi Kartu Keluarga",
            "Surat Pengantar dari RT atau Dusun setempat",
            "Surat pindah atau surat keterangan tempat tinggal bagi warga yang alamat domisilinya belum sesuai dengan KTP",
            "Keterangan tujuan penggunaan surat"
        ]
    },
    {
        nama: "Surat Keterangan Beda Nama",
        desc: "Menyatakan bahwa dua penulisan nama di dokumen berbeda merujuk pada orang yang sama.",
        berkas: [
            "Fotokopi KTP pemohon",
            "Fotokopi Kartu Keluarga",
            "Surat Pengantar dari RT atau Dusun setempat",
            "Dokumen asli dan fotokopi yang memuat perbedaan penulisan nama, seperti ijazah, akta kelahiran, buku nikah, kartu BPJS, atau buku rekening",
            "Keterangan mengenai nama dan dokumen yang perlu disesuaikan"
        ],
        catatan: "Bawa semua dokumen yang memiliki perbedaan penulisan nama agar petugas dapat mencocokkan datanya."
    },
    {
        nama: "Surat Pengantar SKCK",
        desc: "Surat pengantar desa sebagai syarat membuat SKCK di kepolisian.",
        berkas: [
            "Fotokopi KTP pemohon",
            "Fotokopi Kartu Keluarga",
            "Surat Pengantar dari RT atau Dusun setempat",
            "Fotokopi akta kelahiran atau ijazah terakhir",
            "Pas foto terbaru (ukuran sesuai ketentuan petugas)"
        ],
        catatan: "Syarat di kepolisian dapat berbeda. Tanyakan petugas desa dan kepolisian setempat."
    }
];


/*
 * Pilihan status yang dapat dipilih operator.
 *
 * Nilainya harus cocok dengan status yang dikenali server.
 */
const STATUS_OPTIONS = [
    "Diproses",
    "Siap Diambil",
    "Selesai"
];


/*
 * Tampilan untuk setiap status dari server.
 *
 * key digunakan oleh CSS melalui data-status.
 * label menjadi teks yang terlihat oleh operator.
 * step menunjukkan urutan kemajuan pelayanan.
 *
 * "pending" tetap didukung sebagai status lama dan ditampilkan
 * sebagai "Sedang Diproses".
 */
const STATUS_STYLE = {
    pending: {
        key: "pending",
        label: "Sedang Diproses",
        step: 0
    },

    diproses: {
        key: "diproses",
        label: "Sedang Diproses",
        step: 0
    },

    "siap diambil": {
        key: "siap diambil",
        label: "Siap Diambil",
        step: 1
    },

    selesai: {
        key: "selesai",
        label: "Selesai",
        step: 2
    }
};


/*
 * Mengambil aturan tampilan untuk satu status.
 *
 * Status dirapikan menjadi huruf kecil agar "Diproses",
 * "DIPROSES", dan " diproses " dikenali sebagai status yang sama.
 *
 * Status yang belum dikenali tetap ditampilkan menggunakan teks
 * aslinya agar masalah data tidak disembunyikan dari operator.
 */
function getStatusStyle(status) {
    const normalizedStatus = String(status || "").trim().toLowerCase();

    return STATUS_STYLE[normalizedStatus] || {
        key: "unknown",
        label: status || "Tidak diketahui",
        step: -1
    };
}